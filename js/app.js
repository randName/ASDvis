const asd = new ASD()
const terms = [3, 4, 5, 6, 7, 8]
const sources = ['sections', 'people']

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

class Item {
  constructor(item) {
    Object.assign(this, item)
    this.nodes = []
    this.selected = 0
  }
}

Promise.all(sources.map((s) => d3.csv(`data/${s}.csv`))).then((r) => {
  const raw = r[1].map((p) => ({...p, id: parseInt(p.id)}))
  asd.init(Object.assign({terms}, process(raw, r[0])))
})

function process(raw, sections) {
  const gid = (t, s) => t === 3 ? `F0${s}` : `T${t}-S${s}`

  const groups = [].concat(...sections.map(
    (n) => terms.filter((t) => n[t]).map((term) => new Item({
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
    return new Item(p)
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
      person: p,
      target: n.id,
      source: p.nodes[i].id
    }))
  ))

  return {people, groups, nodes, links}
}