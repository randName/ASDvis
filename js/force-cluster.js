d3.forceCluster = function () {
  let nodes, clusters
  let strength = 0.5
  let radius = 10

  let id = (i) => i.cluster

  if (clusters == null) clusters = []

  const z = {x: 0, y: 0}

  function force(alpha) {
    clusters.forEach((c) => {
      const avg = c.nodes.reduce((o, n) => ({x: o.x+(n.x||0), y: o.y+(n.y||0)}), z)
      c.x = c.fx ? c.fx : avg.x / c.nodes.length
      c.y = c.fy ? c.fy : avg.y / c.nodes.length

      c.nodes.forEach((n) => {
        let x = (n.x - c.x) || 0,
            y = (n.y - c.y) || 0,
            l = Math.hypot(x, y)
        l = strength * (l - radius) / l
        n.vx -= x * l
        n.vy -= y * l
      })
    })
  }

  function init() {
    if (!nodes) return
    clusters.forEach((c) => {
      c.nodes = nodes.filter((n) => id(n) === c.id)
    })
  }

  force.initialize = (_) => {
    nodes = _
    init()
  }

  force.id = function (_) {
    return arguments.length ? (id = _, force) : id
  }

  force.clusters = function (_) {
    return arguments.length ? (clusters = _, init(), force) : clusters
  }

  force.strength = function (_) {
    return arguments.length ? (strength = _, force) : strength
  }

  force.radius = function (_) {
    return arguments.length ? (radius = _, force) : radius
  }

  return force
}