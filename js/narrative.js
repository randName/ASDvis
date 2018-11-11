const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

class Appearance {
  constructor(scene, character) {
    this.scene = scene
    this.character = character

    this.pathSpace = 11
    this.scenePadding = [0, 0, 0, 0]
  }

  get h () {
    return this.scene.appearances.map((a) => a.character).indexOf(this.character)
  }

  get y () {
    return (this.h + 0.5) * this.pathSpace + this.scenePadding[0]
  }

  get x () {
    return this.scenePadding[3]
  }
}

class Introduction {
  constructor(character) {
    this.character = character
    this.ref = character.appearances[0]

    this.scale = 50
  }

  get x () {
    return this.ref.scene.x - 0.5 * this.scale
  }

  get y () {
    return this.ref.scene.y + this.ref.y
  }
}

class Narrative {
  constructor(scenes, characters=[]) {
    this.scenes = scenes
    this.characters = characters
    this.process()

    this.size = [1, 1]
    this.pathSpace = 10
    this.labelSize = [100, 15]
    this.scenePadding = [0, 0, 0, 0]
  }

  extent () {
    return this.scenes.reduce((max, d) => {
      const x = d.x + d.width
      const y = d.y + d.height
      if (y > max[1]) { max[1] = y }
      if (x > max[0]) { max[0] = y }
      return max
    }, [0, 0])
  }

  transform () {
    return (d) => {
      return `translate(${Math.round(d.x)},${Math.round(d.y)})`
    }
  }

  link (curvature = 0.5) {
    return (d) => {
      const z = {x: 0, y: 0}
      const s = d.source.scene || z
      const t = d.target.scene || z
      const x0 = d.source.x + s.x, x1 = d.target.x + t.x
      const y0 = d.source.y + s.y, y1 = d.target.y + t.y
      const ci = d3.interpolateNumber(x0, x1)
      const c0 = ci(curvature), c1 = ci(1-curvature)
      return `M${x0},${y0}C${c0},${y0} ${c1},${y1} ${x1},${y1}`
    }
  }

  characterAppearances () {
    return this.scenes.reduce(
      (o, s) => s.characters.reduce((p, c) => ({...p, [c.id]: (p[c.id] || 0) + 1}), o), {})
  }

  process () {
    let scenes = this.scenes

    scenes.forEach((s) => {
      s.characters.forEach((c) => {
        c = (typeof c === 'object') ? c : this.characters[c]
        c.appearances = []
      })
      s.appearances = []
    })

    let counts = this.characterAppearances()
    while ( Object.keys(counts).some((i) => counts[i] < 2) || scenes.some((s) => s.characters.length < 2) ) {
      scenes = scenes.filter((s) => s.characters.length > 1)
      counts = this.characterAppearances()
      scenes.forEach((s) => { s.characters = s.characters.filter((c) => counts[c.id] > 1) })
    }

    this.appearances = [].concat(...scenes.map(
      (scene) => scene.characters.map((character) => new Appearance(scene, character))
    ))

    let characters = []
    this.appearances.forEach((a) => {
      a.scene.appearances.push(a)
      a.character.appearances.push(a)
      if (characters.indexOf(a.character) === -1) {
        characters.push(a.character)
      }
    })

    this.introductions = characters.map((c) => {
      c.introduction = new Introduction(c)
      return c.introduction
    })

    this.links = [].concat(...characters.map(
      (character) => character.appearances.map((target, i) => ({
        character, target, source: i ? character.appearances[i-1] : character.introduction
      }))
    ))

    this.characters = characters
  }

  layout () {
    Appearance.prototype.pathSpace = this.pathSpace
    Appearance.prototype.scenePadding = this.scenePadding

    const sp = this.scenePadding
    const horizontal = this.size[0] - this.labelSize[0]
    const charPos = (i) => i * this.pathSpace + this.pathSpace / 2

    const duration = this.scenes.reduce((d, s) => {
      s.start = s.start || d
      s.duration = s.duration || 1
      return d + s.duration
    }, 1)

    const scale = horizontal / duration

    this.scenes.forEach((s) => {
      const sum = s.appearances.reduce((t, a, i) => {
        return t + charPos(this.characters.indexOf(a.character))
      }, 0)

      s.width = sp[1] + sp[3]
      s.height = charPos(s.appearances.length) - this.pathSpace/2 + sp[0] + sp[2]
      s.x = clamp(scale * s.start + this.labelSize[0], 0, this.size[0])
      s.y = clamp(sum / s.appearances.length - s.height/2, 0, this.size[1])
    })
  }
}
