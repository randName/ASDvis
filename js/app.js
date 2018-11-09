const label = 11
const size = [1890, 950]
const svg = d3.select('body').append('svg')
  .attr('width', size[0]).attr('height', size[1])

const terms = [4, 5, 6, 7, 8]
const intoObject = (o, k) => ({...o, [k]: {}})
const getCommon = (a, b) => terms.reduce((s, t) => s + (a[t] === b[t]), 0)

const sections = terms.reduce(intoObject, {})
let data = []

Promise.all([d3.csv('sections.csv'), d3.csv('data.csv')]).then((r) => {
  r[0].forEach((n) => terms.filter((t) => n[t]).forEach((t) => { sections[t][n.n] = n[t] }))
  data = r[1].map((p) => ({...p, id: parseInt(p.id)}))
  createChart(process(data, getSeed()))
})

window.onhashchange = () => {
  createChart(process(data, getSeed()))
}

function reload() {
  window.location.hash = Math.round(Math.random() * 10000)
}

function getSeed() {
  if (window.location.hash) {
    return parseInt(window.location.hash.split('#')[1])
  }
  return 1
}

function seededrandom (seed = 123456) {
  seed = seed % 2147483647
  return () => {
    seed = seed * 16807 % 2147483647
    return (seed - 1) / 2147483646
  }
}

function process(data, seed=1) {
  const random = seededrandom(seed)
  const rand = () => random() - 0.5

  const groups = terms.reduce(intoObject, {})
  const people = data.reduce((o, p) => {
    const common = data.filter((q) => p.id !== q.id).map((q) => [getCommon(p, q), q.id]).sort()
    terms.forEach((t) => {
      const k = p[t]
      if (k == '-') return
      if (!(k in groups[t])) { groups[t][k] = [] }
      groups[t][k].push(p.id)
    })
    return {
      ...o,
      [p.id]: {
        ...p,
        common,
        pathed: 0,
        mostCommon: common[common.length-1]
      }
    }
  }, {})

  const scenes = [].concat(...terms.map((term) =>
    Object.keys(groups[term]).map((section) => ({
      term, section,
      id: `T${term}-S${section}`,
      name: sections[term][section],
      characters: groups[term][section].map((i) => people[i]).sort(rand)
    })).sort(rand)
  ))

  scenes.unshift({
    id: 'freshmore',
    characters: Object.values(people).sort(rand).sort((a, b) => a.f - b.f)
  })

  return scenes
}

function createChart(scenes) {
  let narrative = d3.narrative().scenes(scenes)
    .size(size).pathSpace(label)
    .labelSize([50, label]).labelPosition('left')
    .layout()

  const transf = (d) => `translate(${Math.round(d.x)},${Math.round(d.y)})`
  const pather = (s) => (d) => {
    const c = d.character
    if (s === null) {
      c.pathed = (c.pathed === 2) ? 0 : 2
    } else if ( c.pathed !== 2 ){
      c.pathed = s
    }
    const t = c.pathed
    d3.selectAll(`[p='${c.id}']`)
      .style('stroke-width', t ? 2 : 1)
      .style('stroke-opacity', t ? 1 : 0.2)
    d3.selectAll(`[sp='${c.id}']`)
      .style('fill', t ? '#666' : '#fff')
      .attr('r', t ? 3 : 2)
    scenes.forEach((k) => {
      const h = k.characters.some((p) => p.pathed)
      d3.selectAll(`[s='${k.id}']`)
        .style('fill-opacity', h ? 1 : 0.7)
        .style('stroke-width', h ? 2 : 0.5)
    })
  }

  const drawLinks = (i) => d3.selectAll(`[to='${i}'],[from='${i}']`).attr('d', narrative.link())

  const dragScene = d3.drag().on('drag', function (d) {
    d.x += d3.event.dx
    d.y += d3.event.dy
    d3.select(this).attr('transform', transf)
    drawLinks(d.id)
  })

  const dragLink = d3.drag().on('drag', function (d) {
    const e = d3.event
    const st = ['source', 'target']
    const sorty = (a, b) => a.y - b.y
    const dist = (p) => Math.hypot(p.x - e.x, p.y - e.y)
    const l = scenes.reduce((a, s) => {
      const i = st.reduce((v, k, i) => (d[k].scene && d[k].scene.id == s.id) ? i : v, null)
      if (i !== null) { a[i] = dist(s) }
      return a
    }, [dist(d.character.introduction), null])

    const change = d[st.reduce((v, k, i) => (l[i] < l[1-i] && l[i] < 50) ? k : v, null)]
    if (change === undefined) return

    const apps = (change.scene || scenes[0]).appearances
    const ci = apps.reduce((v, a, i) => a.character.id === d.character.id ? i : v, null)
    const ni = ci + Math.sign(e.dy)
    if (apps[ni] === undefined) return

    [apps[ci].y, apps[ni].y] = [apps[ni].y, apps[ci].y]
    apps.sort(sorty)
    d3.selectAll('.appearance').attr('cy', (d) => d.y)

    if (change.scene) {
      drawLinks(change.scene.id)
      return
    }

    const intros = narrative.introductions()
    const oy = intros[ci].y
    intros[ci].y = intros[ni].y
    intros[ni].y = oy
    intros.sort(sorty)
    d3.selectAll('.intro').attr('transform', transf)
    drawLinks('freshmore')
  })

  d3.selectAll('svg > *').remove()

  svg.selectAll('.link').data(narrative.links()).enter().append('path')
    .attr('class', 'link')
    .attr('d', narrative.link())
    .attr('p', (d) => d.character.id)
    .attr('to',(d) => d.target.scene.id)
    .attr('from', (d) => d.source.scene ? d.source.scene.id : d.character.id)
    .style('stroke-opacity', 0.2)
    .style('stroke-width', 1)
    .on('click', pather(null))
    .on('mouseout', pather(0))
    .on('mouseover', pather(1))
    .call(dragLink)

  svg.selectAll('.scene').data(narrative.scenes()).enter().call((s) => {
    const g = s.append('g')
      .call(dragScene)
      .attr('class', 'scene')
      .attr('transform', transf)
      .attr('term', (d) => d.term)
      .attr('section', (d) => d.section)
      .attr('name', (d) => d.name || d.id)

    g.append('title').text((d) => d.name ? `T${d.term}: ${d.name}` : d.id)

    g.append('rect')
      .attr('s', (d) => d.id)
      .attr('width', 20).attr('height', (d) => d.height)
      .attr('x', -10).attr('y', 0)
      .attr('rx', 3).attr('ry', 3)
      .style('stroke-width', 0.5)
      .style('fill-opacity', 0.7)
  })

  svg.selectAll('.scene').selectAll('.appearance').data((d) => d.appearances).enter()
    .append('circle')
    .attr('class', 'appearance')
    .attr('sp', (d) => d.character.id)
    .attr('cy', (d) => d.y)
    .attr('cx', 0)
    .attr('r', 2)
    .style('fill', '#fff')

  svg.selectAll('.intro').data(narrative.introductions()).enter().append('text')
    .attr('class', 'intro')
    .attr('transform', transf)
    .attr('y', 2).attr('x', -4)
    .attr('text-anchor', 'end')
    .text((d) => d.character.nick)
}