const label = 11
const size = [1890, 950]
const svg = d3.select('body').append('svg')
  .attr('width', size[0]).attr('height', size[1])

const terms = [4, 5, 6, 7, 8]

let sections = {}
terms.forEach((t) => { sections[t] = {} })
d3.csv('sections.csv', (r) => r.forEach((n) => {
  terms.filter((t) => n[t]).forEach((t) => { sections[t][n.n] = n[t] })
}))

let data = []

d3.csv('data.csv', (r) => {
  data = r
  createChart(process(r, seed=getSeed()))
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
  let people = {}, groups = {}

  let random = seededrandom(seed)
  let rand = () => random() - 0.5

  terms.forEach((t) => { groups[t] = {} })

  data.forEach((p) => {
    p.id = parseInt(p.id)
    terms.forEach((t) => {
      let k = p[t]
      if (k == '-') return
      if (k in groups[t]) {
        groups[t][k].push(p.id)
      } else {
        groups[t][k] = [p.id]
      }
    })
    p.pathed = 0
    people[p.id] = p
  })

  let scenes = [{
    id: 'freshmore',
    characters: Object.values(people).sort(rand).sort((a, b) => a.f - b.f)
  }]

  terms.forEach((term) => scenes.push(
    ...Object.keys(groups[term]).map((section) => ({
      term, section,
      id: `T${term}-S${section}`,
      name: sections[term][section],
      characters: groups[term][section].map((i) => people[i]).sort(rand)
    })).sort(rand)
  ))

  return scenes
}

function createChart(scenes) {
  let narrative = d3.layout.narrative().scenes(scenes)
    .size(size).pathSpace(label)
    .labelSize([50, label]).labelPosition('left')
    .layout()

  let transf = (d) => `translate(${Math.round(d.x)},${Math.round(d.y)})`
  let pather = (s) => (d) => {
    let c = d.character
    if (s === null) {
      c.pathed = (c.pathed === 2) ? 0 : 2
    } else if ( c.pathed !== 2 ){
      c.pathed = s
    }
    let t = c.pathed
    d3.selectAll(`[p='${c.id}']`)
      .style('stroke-width', t ? 2 : 1)
      .style('stroke-opacity', t ? 1 : 0.2)
    d3.selectAll(`[sp='${c.id}']`)
      .style('fill', t ? '#666' : '#fff')
      .attr('r', t ? 3 : 2)
    scenes.forEach((k) => {
      t = k.characters.some((p) => p.pathed)
      d3.selectAll(`[s='${k.id}']`)
        .style('fill-opacity', t ? 1 : 0.7)
        .style('stroke-width', t ? 2 : 0.5)
    })
  }

  let drawLinks = (i) => d3.selectAll(`[to='${i}'],[from='${i}']`).attr('d', narrative.link())

  let dragScene = d3.behavior.drag().on('drag', function (d) {
    d.x += d3.event.dx
    d.y += d3.event.dy
    d3.select(this).attr('transform', transf)
    drawLinks(d.id)
  })

  let dragLink = d3.behavior.drag().on('drag', function (d) {
    let e = d3.event, ic = d.character.introduction
    let dist = [Math.hypot(ic.x - e.x, ic.y - e.y), null]

    scenes.forEach((s) => {
      let i = null
      if (d.source.scene && d.source.scene.id == s.id) {
        i = 0
      } else if (d.target.scene && d.target.scene.id == s.id) {
        i = 1
      }
      if (i !== null) {
        dist[i] = Math.hypot(s.x - e.x, s.y - e.y)
      }
    })

    let change = null
    if (dist[0] < dist[1] && dist[0] < 50) {
      change = 'source'
    } else if (dist[1] < dist[0] && dist[1] < 50) {
      change = 'target'
    }
    if (!change) return

    let apps = (d[change].scene || scenes[0]).appearances, ci = null, dir = 0
    apps.forEach((a, i) => { if (a.character.id == d.character.id) ci = i })

    if (e.dy > 0 && ci != apps.length - 1) {
      dir = 1
    } else if (e.dy < 0 && ci != 0) {
      dir = -1
    }
    if (!dir) return

    [apps[ci].y, apps[ci + dir].y] = [apps[ci + dir].y, apps[ci].y]
    let sorty = (a, b) => a.y - b.y
    apps.sort(sorty)
    d3.selectAll('.appearance').attr('cy', (d) => d.y)

    if (d[change].scene) {
      drawLinks(d[change].scene.id)
    } else {
      ic = narrative.introductions()
      let oy = ic[ci].y, ny = ic[ci + dir].y
      ic[ci].y = ny
      ic[ci + dir].y = oy
      ic.sort(sorty)
      d3.selectAll('.intro').attr('transform', transf)
      drawLinks('freshmore')
    }
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
    let g = s.append('g')
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