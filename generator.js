
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
  return sequence(n).map((_, value) => `<label for="${name}${value}"></label>`).join('\n')
}

function createRadio(name, value, checked = false) {
  return `<input type="radio" id="${name}${value}" name="${name}" value="${value}"${checked ? ' checked' : ''}>`
}

function sequence(n) {
  return [...new Array(n)].map((_, v) => v)
}

const byteSize = 16
const State = {
  none: 0,
  read: 1, readDec: 2, readInc: 3, write: 4,
  input: 5, output: 6,
  before: 7, after: 8
}
const stateSize = Object.keys(State).length
function builder(progSize, ptrSize) {
  const html = [
    [
      createRadios(stateSize, 'state'),
      createRadios(progSize, 'pc'),
      createRadios(progSize, '_pc'),
      createRadios(ptrSize, 'ptr'),
      createRadios(ptrSize, '_ptr'),
      createRadios(byteSize, 'current'),
    ].join('').replace(/\n/g, '') + '<div id="mem">',
    sequence(ptrSize).map(ptr => createRadioLabels(byteSize, `v${ptr}-`, [`v${ptr}-`, 0], ['current', 0], ['current', -1], ['current', +1])).join('\n'),
    createLabels(stateSize, 'state'),
    createLabels(progSize, 'pc'),
    createLabels(progSize, '_pc'),
    createLabels(ptrSize, 'ptr'),
    createLabels(ptrSize, '_ptr'),
    `<div id="output"><div></div><label for="state${State.after}">ok</label></div>`,
    '<div id="input">',
    sequence(byteSize).map(v => `<label for="current${v}">${v.toString(16)}</label>`).join(''),
    `<label for="state${State.write}">ok</label>`,
    '</div>',
    '</div>'
  ].join('\n')
  const rule = new Rule(progSize, ptrSize)
  return { html, rule }
}
function generate(progSize = 8, ptrSize = 8) {
  const { html, rule } = builder(progSize, ptrSize)
  for (let ptr of sequence(ptrSize)) {
    for (let value of sequence(byteSize)) {
      rule.add({
        state: State.write,
        ptr,
        current: value
      }, `#v${ptr}-${value}:not(:checked)+*`, 'display: block;')
      ;[State.read, State.readDec, State.readInc].forEach((state, i) => {
        const diff = [0, -1, 1][i]
        const selector = `#v${ptr}-${value}:checked${new Array(i + 2).fill('+*').join('')}`
        rule.add({ state, ptr, current: ~(value + diff) }, selector)
      })
      rule
    }
  }
  rule.add({ state: State.output }, '#output', 'display:block;')
  for (let value of sequence(byteSize)) {
    rule.add({ state: State.output, current: value }, '#output div:after', `content: ${JSON.stringify(value.toString(16))}`)
  }
  rule.add({ state: State.input }, '#input', 'display:block')
  return ['<style>', rule.toCSS(), '</style>', html].join('\n')
}

function parseBF(code) {
  const ops = []
  const stack = []
  const jump = new Map()
  for (const op of code) {
    switch(op) {
      case '[':
        stack.push(ops.length)
        ops.push(op)
        break
      case ']':
        if (stack.length === 0) throw 'error'
        const idx = stack.pop()
        jump.set(ops.length, idx)
        ops.push(op)
        break
      case '+':
      case '-':
      case '>':
      case '<':
      case '.':
      case ',':
        ops.push(op)
    }
  }
  jump.forEach((e, s) => {
    ops[s] = ['[', e]
    ops[e] = [']', s]
  })
  return ops
}
class Rule {
  styles = []
  constructor(progSize, ptrSize) {
    this.progSize = progSize
    this.ptrSize = ptrSize
  }
  add({ state, pc, _pc, ptr, _ptr, current }, selector, style = 'display: block;') {
    const { progSize, ptrSize } = this
    let idx = -1
    const selectors = []
    const positions = [
      [0, 'state', state],
      [stateSize, 'pc', pc],
      [stateSize + progSize, '_pc', _pc],
      [stateSize + progSize * 2, 'ptr', ptr],
      [stateSize + progSize * 2 + ptrSize, '_ptr', _ptr],
      [stateSize + progSize * 2 + ptrSize * 2, 'c', current]
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
      const diff = stateSize + 2 * progSize + 2 * ptrSize + byteSize - idx
      selectors.push(`${new Array(diff).fill('+*').join('')}`) 
    }
    this.styles.push([selectors.join('') + ' ' + selector, style])
  }
  toCSS() {
    return this.styles.map(([selector, style]) => `${selector}{${style}}`).join('\n')
  }
}