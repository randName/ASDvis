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
  let sections = r[0]
  data = process(r[1].map((p) => ({...p, id: parseInt(p.id)})), sections)
})

function process(raw, sections) {
  const gid = (t, s) => t === 3 ? `F0${s}` : `T${t}-S${s}`

  const groups = [].concat(...sections.map(
    (n) => terms.filter((t) => n[t]).map((term) => new Group({
      id: gid(term, n.n),
      name: n[term], people: [],
      term, section: parseInt(n.n)
    }))
  )).sort((a, b) => a.term - b.term)

  const people = raw.map((p) => {
    terms.forEach((t) => {
      const s = groups.find((g) => g.id  === gid(t, p[t]))
      if (!s) return
      s.people.push(p.id)
    })
    return new Person(p)
  })

  const nodes = [].concat(...groups.map((group) => group.people.map((p) => {
    const person = people.find((i) => i.id === p)
    const n = {
      group, person,
      id: `${group.id}-${p}`
    }
    ;[group, person].forEach((i) => i.nodes.push(n))
    return n
  })))

  const links = [].concat(...people.map((p) => p.nodes
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(1).map((n, i) => ({
      person: p.id,
      target: n.id,
      source: p.nodes[i].id
    }))
  ))

  return {people, groups, nodes, links}
}