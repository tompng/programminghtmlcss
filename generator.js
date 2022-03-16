
const ptrId = 'c'
function ptrName(idx = 0) { return `ptr${idx}` }
function ptrValueName(idx = 0, value = 0) { return `ptr${idx}-${value}` }
function currentValueName(value = 0) { return `c${value}` }


function createRadios(n, name) {
  return sequence(n).map(
    (_, value) => createRadio(name, value, value === 0)
  ).join('\n')
}

function createRadioLabels(n, name, ...labelNameAdds) {
  return sequence(n).map((_, value) => {
    const radio = createRadio(name, value, value === 0)
    const labels = labelNameAdds.map(([name, offset]) => `<label for="${name}${(value + offset + n) % n}"></label>`)
    return radio + labels.join('')
  }).join('\n')
}

function createLabels(n, name) {
  return sequence(n).map((_, value) => `<label for="${name}${value}></label>"`).join('\n')
}

function createRadio(name, value, checked = false) {
  return `<input type="radio" id="${name}${value}" name="${name}" value="${value}"${checked ? ' checked' : ''}>`
}

function sequence(n) {
  return [...new Array(n)].map((_, v) => v)
}

const ByteSize = 16
const State = { none: 0, read: 1, readDec: 2, readInc: 3, write: 4 }
function builder(stateSize, progSize, ptrSize) {
  const html = [
    [
      createRadios(stateSize, 'state'),
      createRadios(progSize, 'pc'),
      createRadios(ptrSize, 'ptr'),
      createRadios(ByteSize, 'current'),
    ].join('').replace(/\n/g, '') + '<div id="mem">',
    sequence(ptrSize).map(ptr => createRadioLabels(ByteSize, `v${ptr}-`, [`v${ptr}-`, 0], ['current', 0], ['current', -1], ['current', +1])).join('\n'),
    '</div>'
  ].join('\n')
  const rule = new Rule(stateSize, progSize, ptrSize)
  return { html, rule }
}
function generate(stateSize = 5, progSize = 8, ptrSize = 8) {
  const { html, rule } = builder(stateSize, progSize, ptrSize)
  for (let ptr of sequence(ptrSize)) {
    for (let value of sequence(ByteSize)) {
      rule.add({
        state: State.write,
        ptr,
        current: value
      }, `#v${ptr}-${value}:not(:checked)+*`, 'display: block;')
      rule.add({
        state: State.read,
        ptr,
        current: ~value
      }, `#v${ptr}-${value}:checked+*+*`, 'display: block;')
      ;[State.read, State.readDec, State.readInc].forEach((state, i) => {
        const diff = [0, -1, 1][i]
        const selector = `#v${ptr}-${value}:checked${new Array(i + 2).fill('+*').join('')}`
        rule.add({ state, ptr, current: ~(value + diff) }, selector)  
      })
    }
  }
  return ['<style>', rule.toCSS(), '</style>', html].join('\n')
}

class Rule {
  styles = []
  constructor(stateSize, progSize, ptrSize) {
    this.stateSize = stateSize
    this.progSize = progSize
    this.ptrSize = ptrSize
  }
  add({ state, pc, ptr, current }, selector, style = 'display: block;') {
    const { stateSize, progSize, ptrSize } = this
    let idx = -1
    const selectors = []
    const positions = [
      [0, 'state', state],
      [stateSize, 'pc', pc],
      [stateSize + progSize, 'ptr', ptr],
      [stateSize + progSize + ptrSize, 'c', current]
    ]
    for (const [offset, prefix, value] of positions) {
      if (value == null) continue
      const v = value < 0 ? ~value : value
      const mode = value === v ? 'checked' : 'not(:checked)'
      if (idx === -1) {
        selectors.push(`#${prefix}${v}:${mode}`)
      } else {
        const diff = offset + v - idx
        selectors.push(`${new Array(diff).fill('+*').join('')}:${mode}`) 
      }
      idx = offset + v
    }
    if (idx === -1) {
      selectors.push('#mem')
    } else {
      const diff = stateSize + progSize + ptrSize + ByteSize - idx
      selectors.push(`${new Array(diff).fill('+*').join('')}`) 
    }
    this.styles.push([selectors.join('') + ' ' + selector, style])
  }
  toCSS() {
    return this.styles.map(([selector, style]) => `${selector}{${style}}`).join('\n')
  }
}