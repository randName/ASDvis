const label = 11
const size = [1890, 950]
const svg = d3.select('body').append('svg')
  .attr('width', size[0]).attr('height', size[1])

let data = []

d3.csv('data.csv', (r) => {
  data = r
  createChart(process(r))
})

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
    p.width = svg.append('text').attr('class', 'temp')
      .text(p.nick).node().getComputedTextLength() + 10
    people[p.id] = p
  })

  svg.selectAll('text.temp').remove()

  let scenes = [{
    id: 'freshmore',
    characters: Object.values(people).sort((a, b) => a.f - b.f)
  }]

  let rand = () => random() - 0.5
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
  let stroke = (s) => (d) => d3.selectAll(`[p='${d.character.id}']`).style('stroke-opacity', s)

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
    .on('mouseout', stroke(0.2))
    .on('mouseover', stroke(1))

  svg.selectAll('.scene').data(narrative.scenes()).enter().call((s) => {
    let g = s.append('g').call(drag).attr('transform', transf)

    g.append('rect')
      .attr('width', 20).attr('height', (d) => d.height)
      .attr('x', -10).attr('y', 0)
      .attr('rx', 3).attr('ry', 3)

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('x', (d) => -d.height/2)
      .attr('y', (d) => d.width/2 + 5)
      .style('font-size', 12)
      .text((d) => d.id)
  })

  svg.selectAll('.intro').data(narrative.introductions()).enter().append('text')
    .attr('transform', transf)
    .attr('y', 2).attr('x', -4)
    .attr('text-anchor', 'end')
    .text((d) => d.character.nick)
}