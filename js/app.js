const size = [window.innerWidth - 20, window.innerHeight - 30]
const svg = d3.select('body').append('svg')
  .attr('width', size[0])
  .attr('height', size[1])

const terms = [3, 4, 5, 6, 7, 8]

window.onhashchange = () => {
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
class Person {
  constructor(person) {
    Object.assign(this, person)
    this.nodes = []
    this.selected = 0
  }
}

class Group {
  constructor(group) {
    Object.assign(this, group)
    this.nodes = []
    this.selected = 0
  }
}

let data

Promise.all([d3.csv('sections.csv'), d3.csv('data.csv')]).then((r) => {
  let sections = terms.reduce((o, k) => ({...o, [k]: {}}), {})

  r[0].forEach((n) => terms.filter((t) => n[t]).forEach((t) => {
    sections[t][n.n] = { name: n[t], people: [] }
  }))

  data = process(r[1].map((p) => ({...p, id: parseInt(p.id)})), sections)
})

function process(raw, sections) {
  const people = raw.reduce((o, p) => {
    terms.forEach((t) => {
      const k = p[t]
      if (k == '-') return
      sections[t][k].people.push(p.id)
    })
    return {...o, [p.id]: new Person(p)}
  }, {})

  const groups = [].concat(...terms.map(
    (term) => Object.keys(sections[term])
      .map((s) => parseInt(s))
      .map((section) => new Group({
        term, section,
        ...sections[term][section],
        id: term === 3 ? `F0${section}` : `T${term}-S${section}`,
      }))
  ))

  const nodes = [].concat(...groups.map((group) => group.people.map((p) => {
    const person = people[p], n = {
      group, person,
      id: `${group.id}-${people[p].id}`
    }
    group.nodes.push(n)
    person.nodes.push(n)
    return n
  })))

  const links = [].concat(...Object.values(people).map(
    (p) => p.nodes.slice(1).map((n, i) => ({
      person: p.id,
      target: n.id,
      source: p.nodes[i].id
    }))
  ))

  return {people, groups, nodes, links}
}