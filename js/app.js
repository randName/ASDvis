const label = 11
const size = [1890, 950]
const svg = d3.select('body').append('svg')
  .attr('width', size[0]).attr('height', size[1])

const terms = [4, 5, 6, 7, 8]
const data = {
  people: {},
  narrative: null,
  sections: terms.reduce((o, k) => ({...o, [k]: {}}), {})
}

window.onhashchange = () => {
  layoutChart(data.narrative, getSeed())
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

Promise.all([d3.csv('sections.csv'), d3.csv('data.csv')]).then((r) => {
  let sections = data.sections

  r[0].forEach((n) => terms.filter((t) => n[t]).forEach((t) => {
    sections[t][n.n] = { name: n[t], people: [] }
  }))

  const raw = r[1].map((p) => ({...p, id: parseInt(p.id)}))
  const getCommon = (a, b) => terms.reduce((s, t) => s + (a[t] === b[t]), 0)

  data.people = raw.reduce((o, p) => {
    const m = raw.filter((q) => p.id !== q.id).map((q) => [getCommon(p, q), q.id]).sort()
    const common = [...Array(m[m.length-1][0]+1)].map((_, i) => m.filter((c) => c[0] === i).map((c) => c[1]).sort())

    terms.forEach((t) => {
      const k = p[t]
      if (k == '-') return
      sections[t][k].people.push(p.id)
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
    Object.keys(sections[term]).map((section) => ({
      term, section,
      id: `T${term}-S${section}`,
      name: sections[term][section].name,
      characters: sections[term][section].people.map((i) => data.people[i])
    }))
  ))

  scenes.unshift({
    id: 'freshmore',
    characters: Object.values(data.people).sort((a, b) => a.f - b.f)
  })

  data.narrative = new Narrative(scenes)
  initChart(data.narrative)
})

function layoutChart(narrative, seed=1) {
  const random = seededrandom(seed)
  const rand = () => random() - 0.5

  narrative.characters.sort(rand)
  narrative.scenes.forEach((s) => {
    s.characters.sort(rand)
    if (s.id == 'freshmore') {
      s.appearances.sort(rand).sort((a, b) => a.character.f - b.character.f)
    } else {
      s.appearances.sort(rand)
    }
  })

  narrative.size = size
  narrative.pathSpace = label
  narrative.labelSize = [50, label]
  narrative.layout()
  adjustChart(narrative)
}

function adjustChart(narrative) {
  svg.selectAll('.link').attr('d', narrative.link())
  svg.selectAll('.scene').attr('transform', narrative.transform())
  svg.selectAll('.intro').attr('transform', narrative.transform())
  svg.selectAll('.appearance').attr('transform', narrative.transform())
}

function initChart(narrative) {
  const pather = (s) => (d) => {
    const c = d.character
    if (s === null) {
      c.pathed = (c.pathed === 2) ? 0 : 2
    } else if ( c.pathed !== 2 ){
      c.pathed = s
    }
    const t = c.pathed
    svg.selectAll(`[p='${c.id}']`)
      .style('stroke-width', t ? 2 : 1)
      .style('stroke-opacity', t ? 1 : 0.2)
    svg.selectAll(`[sp='${c.id}']`)
      .style('fill', t ? '#666' : '#fff')
      .attr('r', t ? 3 : 2)
    narrative.scenes.forEach((k) => {
      const h = k.characters.some((p) => p.pathed)
      svg.selectAll(`[s='${k.id}']`)
        .style('fill-opacity', h ? 1 : 0.7)
        .style('stroke-width', h ? 2 : 0.5)
    })
  }

  const setTransf = (i) => svg.selectAll(i).attr('transform', narrative.transform())
  const drawLinks = (i) => svg.selectAll(`[to='${i}'],[from='${i}']`).attr('d', narrative.link())

  const dragScene = d3.drag().on('drag', function (d) {
    d.x += d3.event.dx
    d.y += d3.event.dy
    d3.select(this).attr('transform', narrative.transform())
    drawLinks(d.id)
  })

  layoutChart(narrative, getSeed())

  svg.selectAll('.link').data(narrative.links).enter().append('path')
    .attr('class', 'link')
    .attr('p', (d) => d.character.id)
    .attr('to',(d) => d.target.scene.id)
    .attr('from', (d) => d.source.scene ? d.source.scene.id : d.character.id)
    .style('stroke-opacity', 0.2)
    .style('stroke-width', 1)
    .on('click', pather(null))
    .on('mouseout', pather(0))
    .on('mouseover', pather(1))

  svg.selectAll('.scene').data(narrative.scenes).enter().call((s) => {
    const g = s.append('g')
      .call(dragScene)
      .attr('class', 'scene')
      .attr('term', (d) => d.term)
      .attr('section', (d) => d.section)
      .attr('name', (d) => d.name || d.id)

    g.append('title').text((d) => d.name ? `T${d.term}: ${d.name}` : d.id)

    g.append('rect')
      .attr('s', (d) => d.id)
      .attr('width', 20).attr('x', -10)
      .attr('height', (d) => d.height)
      .attr('rx', 3).attr('ry', 3)
      .style('stroke-width', 0.5)
      .style('fill-opacity', 0.7)
  })

  svg.selectAll('.scene').selectAll('.appearance').data((d) => d.appearances).enter()
    .append('circle')
    .attr('class', 'appearance')
    .attr('sp', (d) => d.character.id)
    .attr('r', 2)
    .style('fill', '#fff')

  svg.selectAll('.intro').data(narrative.introductions).enter().append('text')
    .attr('class', 'intro')
    .attr('y', 2).attr('x', -4)
    .attr('text-anchor', 'end')
    .text((d) => d.character.nick)

  adjustChart(narrative)
}