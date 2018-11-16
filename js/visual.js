function ASD() {
  const size = [window.innerWidth, window.innerHeight - 75]
  const psel = document.getElementById('people')

  const svg = d3.select('body').append('svg')
    .style('width', '100%')
    .style('height', size[1])

  const g = svg.append('g')

  const zoom = d3.zoom()
    .scaleExtent([0.5, 3])
    .on('zoom', () => g.attr('transform', d3.event.transform))

  zoom.scaleTo(svg, 0.9)
  zoom.translateTo(svg, -size[0]/2, -size[1]/2)
  svg.call(zoom)

  const curvature = 0.5
  const st = ['source', 'target']
  const cr = [curvature, 1 - curvature]

  const transform = (d) => `translate(${Math.round(d.x)},${Math.round(d.y)})`

  let data, sim
  let personSelect
  let termSpace, termX

  const dragPos = (t, d) => {
    if (t < 2 && !d3.event.active) sim.alphaTarget(t ? 0.3 : 0)
    if ( t === 2 ) return d3.event
    if ( t === 0 ) return {x: null, y: null}
    sim.restart()
    return d
  }

  const groupDragger = (t) => (d) => {
    const p = dragPos(t, d)
    d.fx = p.x
    d.fy = p.y
  }

  const dragGroup = d3.drag()
    .on('start', groupDragger(1))
    .on('drag', groupDragger(2))
    .on('end', groupDragger(0))

  const selectLink = (s) => (d) => {
    const p = d.person
    if (s === 2) {
      p.selected = (p.selected === 2) ? 0 : 2
      if ( p.selected === 2 ) {
        personSelect.setChoiceByValue(''+p.id)
      } else {
        personSelect.removeActiveItemsByValue(''+p.id)
      }
    } else if ( p.selected !== 2 ){
      p.selected = s
    }
    showSelections()
  }

  const getCommon = (s, p) => data.terms.reduce((v, t) => v + s.some((q) => p[t] === q[t]), 0)

  function init(_) {
    data = _
    termSpace = size[0] / (data.terms.length + 1)
    termX = (d) => termSpace * (d.group.term - 2) - size[0]/2 + 50

    sim = d3.forceSimulation()
      .force('time', d3.forceX())
      .force('link', d3.forceLink())
      .force('balls', d3.forceCollide(5))
      .force('charge', d3.forceManyBody())
      .force('section', d3.forceCluster())
      .nodes(data.nodes)

    sim.force('time')
      .x(termX)
      .strength(0.2)

    sim.force('link')
      .id((d) => d.id)
      .links(data.links)
      .distance(termSpace * 1.1)
      .strength(1)

    sim.force('charge')
      .distanceMax(size[0])
      .strength(-90)

    sim.force('section')
      .id((d) => d.group.id)
      .clusters(data.groups)
      .strength(0.3)

    personSelect = new Choices(psel, {
      placeholder: true,
      removeItemButton: true,
      placeholderValue: 'Search for people...',
      choices: data.people.map((p) => ({value: ''+p.id, label: p.nick}))
    })

    personSelect.passedElement.element.addEventListener('change', (e) => {
      data.people.forEach((p) => { p.selected = 0 })
      personSelect.getValue(true).forEach((v) => {
        data.people.find((p) => p.id === parseInt(v)).selected = 2
      })
      showSelections()
    })

    layout()
    showSelections()
    sim.on('tick', () => {
      g.selectAll('.node')
        .attr('transform', transform)

      g.selectAll('.group')
        .attr('transform', transform)

      g.selectAll('.link')
        .attr('d', (d) => {
          const x = st.map((i) => d[i].x).map(Math.round)
          const y = st.map((i) => d[i].y).map(Math.round)
          const ci = d3.interpolateNumber(...x)
          const ends = cr.map((_, i) => `${x[i]} ${y[i]}`)
          const curv = cr.map((_, i) => `${Math.round(ci(_))} ${y[i]}`).join(' ')
          return `M ${ends[0]} C ${curv} ${ends[1]}`
        })
    })
  }

  function layout() {
    g.append('g')
      .selectAll('.link')
      .data(data.links).enter()
      .append('path')
        .attr('class', 'link')
        .attr('p', (d) => d.person.id)
        .attr('to', (d) => d.target.id)
        .attr('from', (d) => d.source.id)
        .style('fill', 'none')
        .style('stroke', '#000')
        .on('click', selectLink(2))
        .on('mouseout', selectLink(0))
        .on('mouseover', selectLink(1))
        .append('title').text((d) => `${d.person.nick}`)

    g.append('g')
      .selectAll('.group')
      .data(data.groups).enter()
      .append('circle')
        .call(dragGroup)
        .attr('class', 'group')
        .attr('s', (d) => d.id)
        .attr('r', 25)
        .style('fill', '#fff')
        .style('opacity', 0.8)
        .style('stroke', '#000')
        .append('title').text((d) => `T${d.term}: ${d.name}`)

    g.append('g')
      .selectAll('.node')
      .data(data.nodes).enter()
      .append('circle')
        .attr('class', 'node')
        .attr('p', (d) => d.person.id)
        .attr('r', 2)
        .style('fill', '#000')
        .style('stroke', 'none')
        .append('title').text((d) => `${d.person.nick} (T${d.group.term})`)
  }

  function showSelections() {
    g.selectAll('.link')
      .style('stroke-width', (d) => d.person.selected ? 2 : 1)
      .style('stroke-opacity', (d) => d.person.selected ? 1 : 0.2)

    g.selectAll('.node')
      .style('opacity', (d) => d.person.selected ? 1 : 0.2)

    const sel = data.people.filter((c) => c.selected === 2)
    if ( sel.length === 0 ) return

    const com = data.people.map((p) => [getCommon(sel, p), p.id]).sort()
    const max = com[com.length - 1][0]
    const ratio = (d) => com.find((i) => i[1] === d.person.id)[0] / max

    g.selectAll('.link')
      .style('stroke-opacity', ratio)

    g.selectAll('.node')
      .style('opacity', ratio)
  }

  this.init = init
  this.data = (_) => data
  this.simulation = (_) => sim
  this.showSelections = showSelections

  return this
}