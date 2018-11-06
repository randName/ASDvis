const label = 11
const size = [1890, 950]
const svg = d3.select('body').append('svg')
  .attr('width', size[0]).attr('height', size[1])

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
  let times = ['t4', 't5', 't6', 't7', 't8']
  let people = {}, groups = {}

  let random = seededrandom(seed)
  let rand = () => random() - 0.5

  times.forEach((t) => { groups[t] = {} })

  data.forEach((p) => {
    times.forEach((t) => {
      let k = p[t]
      if (k == '-') return
      if (k in groups[t]) {
        groups[t][k].push(p.id)
      } else {
        groups[t][k] = [p.id]
      }
    })
    p.pathed = 0
    p.width = svg.append('text').attr('class', 'temp')
      .text(p.nick).node().getComputedTextLength() + 10
    people[p.id] = p
  })

  svg.selectAll('text.temp').remove()

  let scenes = [{
    id: 'freshmore',
    characters: Object.values(people).sort(rand).sort((a, b) => a.f - b.f)
  }]

  times.forEach((t) => scenes.push(
    ...Object.keys(groups[t]).map((k) => ({
      id: `${t}-${k}`.toUpperCase(),
      characters: groups[t][k].map((i) => people[i]).sort(rand)
    })).sort(rand)
  ))

  return scenes
}

function createChart(scenes) {
  let narrative = d3.layout.narrative().scenes(scenes)
    .size(size).pathSpace(label)
    .labelSize([50, label]).labelPosition('left')
    .layout()

  let transf = (d) => `translate(${d.x},${d.y})`
  let pather = (s) => (d) => {
    let c = d.character
    if (s === null) {
      c.pathed = (c.pathed === 2) ? 0 : 2
    } else if ( c.pathed !== 2 ){
      c.pathed = s
    }
    let t = c.pathed
    d3.selectAll(`[p='${c.id}']`).style('stroke-opacity', t ? 1 : 0.2)
    d3.selectAll(`[sp='${c.id}']`)
      .style('fill', t ? '#666' : '#fff')
      .attr('r', t ? 3 : 2)
  }

  let drag = d3.behavior.drag().on('drag', function (d) {
    d.x += d3.event.dx
    d.y += d3.event.dy
    d3.select(this).attr('transform', transf)
    d3.selectAll(`[from='${d.id}']`).attr('d', narrative.link())
    d3.selectAll(`[to='${d.id}']`).attr('d', narrative.link())
  })

  d3.selectAll('svg > *').remove()

  svg.selectAll('.link').data(narrative.links()).enter().append('path')
    .attr('d', narrative.link())
    .attr('p', (d) => d.character.id)
    .attr('to',(d) => d.target.scene.id)
    .attr('from', (d) => d.source.scene ? d.source.scene.id : d.character.id)
    .style('stroke-opacity', 0.2)
    .on('click', pather(null))
    .on('mouseout', pather(0))
    .on('mouseover', pather(1))

  svg.selectAll('.scene').data(narrative.scenes()).enter().call((s) => {
    let g = s.append('g').call(drag).attr('transform', transf)
      .attr('class', 'scene')

    g.append('title').text((d) => d.id)

    g.append('rect')
      .attr('width', 20).attr('height', (d) => d.height)
      .attr('x', -10).attr('y', 0)
      .attr('rx', 3).attr('ry', 3)
  })

  svg.selectAll('.scene').selectAll('.appearance').data((d) => d.appearances).enter()
    .append('circle')
    .attr('cx', (d) => d.x).attr('cy', (d) => d.y)
    .attr('sp', (d) => d.character.id)
    .style('fill', '#fff')
    .attr('r', 2)

  svg.selectAll('.intro').data(narrative.introductions()).enter().append('text')
    .attr('transform', transf)
    .attr('y', 2).attr('x', -4)
    .attr('text-anchor', 'end')
    .text((d) => d.character.nick)
}