const baseStyle = `
input {display: none;}
input:checked {
  display: inline;
  position: relative;
  width: 40px;
  height: 40px;
}
input:checked:before {
  background: white;
  position: absolute;
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  font-size: 20px;
  content: attr(value);
}
input[name="state"]:after,
input[name="pc"]:after,
input[name="_pc"]:after,
input[name="ptr"]:after,
input[name="_ptr"]:after,
input[name="current"]:after {
  position: absolute;
  content: attr(name);
}
div#mem{border: 1px solid silver;}
input[name="state"], input[name="state"]:before{width: 120px;}
input[name="state"]:before{font-size:16px;}
input[name="state"][value="0"]:before{content:"start";}
input[name="state"][value="1"]:before{content:"jump";}
input[name="state"][value="2"]:before{content:"after";}
input[name="state"][value="3"]:before{content:"memRead";}
input[name="state"][value="4"]:before{content:"memReadInc";}
input[name="state"][value="5"]:before{content:"memReadDec";}
input[name="state"][value="6"]:before{content:"memWrite";}
input[name="state"][value="7"]:before{content:"pcReadInc";}
input[name="state"][value="8"]:before{content:"pcWrite";}
input[name="state"][value="9"]:before{content:"ptrReadInc";}
input[name="state"][value="10"]:before{content:"ptrReadDec";}
input[name="state"][value="11"]:before{content:"ptrWrite";}
input[name="state"][value="12"]:before{content:"input";}
input[name="state"][value="13"]:before{content:"output";}

label{
  display: none;
  position:absolute;
  z-index: 100;
  left: 5%;
  top: 300px;
  width: 90%;
  height: 200px;
  text-align: center;
  font-size: 40px;
  line-height: 200px;
  background: silver;
  border-radius: 20px;
}
label:after {
  position: absolute;
  left: 0; top: 0;
  width: 100%; height:100%;
  content: 'click here'
}
#input, #output{
  display: none;
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: white;
  text-align: center;
}
#output div {
  text-align: center;
  line-height: 80px;
  height: 80px;
  font-size: 64px;
}
#output div:before {
  font-size: 0.75em;
  content: 'output:'
}
#input label, #output label {
  display: inline-block;
  opacity: 1;
  position: relative;
  text-align: center;
  font-size: 60px;
  line-height: 80px;
  background: white;
  left: auto;
  top: auto;
  border-radius: 0;
  height: 80px;
  width: 80px;
}
#input label.ok, #output label.ok {
  border-radius: 8px;
  font-size: 40px;
  width: 300px;
  background: #eee;
}
#input div {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
#input:before {
  content: 'input';
}
#input label:before, #output label:before, #input label:after, #output label:after {
  content: none;
}
`

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
const states = [
  'start', 'jump', 'after',
  'memRead', 'memReadInc', 'memReadDec', 'memWrite',
  'pcReadNext', 'pcWrite',
  'ptrReadInc', 'ptrReadDec', 'ptrWrite',
  'input', 'output',
]
const State = {}
states.forEach((name, index) => { State[name] = index })

const stateSize = Object.keys(State).length
function builder(progSize, memSize) {
  const html = [
    [
      createRadios(stateSize, 'state'),
      createRadios(progSize, 'pc'),
      createRadios(progSize, '_pc'),
      createRadios(memSize, 'ptr'),
      createRadios(memSize, '_ptr'),
      createRadios(byteSize, 'current'),
    ].join('').replace(/\n/g, '') + '<div id="mem">',
    sequence(memSize).map(ptr => createRadioLabels(byteSize, `v${ptr}-`, [`v${ptr}-`, 0], ['current', 0], ['current', -1], ['current', +1])).join('\n'),
    createLabels(stateSize, 'state'),
    createLabels(progSize, 'pc'),
    createLabels(progSize, '_pc'),
    createLabels(memSize, 'ptr'),
    createLabels(memSize, '_ptr'),
    `<div id="output"><div></div><label class="ok" for="state${State.after}">ok</label></div>`,
    '<div id="input">',
    '<div class="keys">',
    sequence(byteSize).map(v => `<label for="current${v}">${v.toString(16)}</label>`).join(''),
    '</div>',
    `<label class="ok" for="state${State.memWrite}">ok</label>`,
    '</div>',
    '</div>'
  ].join('\n')
  const rule = new Rule(progSize, memSize)
  return { html, rule }
}
function generate(code, memSize = 8) {
  const operations = parseBF(code)
  const progSize = operations.length + 1
  const { html, rule } = builder(progSize, memSize)
  for (let pc of sequence(progSize)) {
    rule.add({ state: State.pcReadNext, pc, _pc: ~(pc + 1) }, `[for="_pc${pc + 1}"]:not(:checked)`)
    rule.add({ state: State.pcWrite, pc: ~pc, _pc: pc }, `[for="pc${pc}"]:not(:checked)`)
  }
  for (let ptr of sequence(memSize)) {
    rule.add({ state: State.ptrReadDec, ptr, _ptr: ~(ptr - 1) }, `[for="_ptr${ptr - 1}"]:not(:checked)`)
    rule.add({ state: State.ptrReadInc, ptr, _ptr: ~(ptr + 1) }, `[for="_ptr${ptr + 1}"]:not(:checked)`)
    rule.add({ state: State.ptrWrite, _ptr: ptr, ptr: ~ptr }, `[for="ptr${ptr}"]:not(:checked)`)
    for (let value of sequence(byteSize)) {
      rule.add({
        state: State.memWrite,
        ptr,
        current: value
      }, `#v${ptr}-${value}:not(:checked)+*`, 'display: block;')
      ;[State.memRead, State.memReadDec, State.memReadInc].forEach((state, i) => {
        const diff = [0, -1, 1][i]
        const selector = `#v${ptr}-${value}:checked${new Array(i + 2).fill('+*').join('')}`
        rule.add({ state, ptr, current: ~((value + diff) % byteSize) }, selector)
      })
      rule
    }
  }
  rule.add({ state: State.output }, '#output', 'display:block;')
  for (let value of sequence(byteSize)) {
    rule.add({ state: State.output, current: value }, '#output div:after', `content: ${JSON.stringify(value.toString(16))}`)
  }
  rule.add({ state: State.input }, '#input', 'display:block')
  addBFRules(rule, operations)
  return ['<html><head><style>', baseStyle, rule.toCSS(), '</style></style></head><body>', html, '</body>'].join('\n')
}

function priorityCSS(priority) {
  return `display:block;z-index:${100 + priority}`
}

function addBFRules(rule, operations) {
  console.log(operations)
  rule.add({ state: State.pcWrite }, `[for="state${State.start}"]`, priorityCSS(-10))
  operations.forEach((op, pc) => {
    switch(op[0]) {
      case '[':
        rule.add({ pc, state: State.start }, `[for="state${State.memRead}"]`)
        rule.add({ pc, state: State.memRead }, `[for="state${State.jump}"]`, priorityCSS(-1))
        rule.add({ pc, state: State.jump, _pc: ~pc }, `[for="_pc${pc}"]`)
        rule.add({ pc, state: State.jump, _pc: pc }, `[for="state${State.after}"]`)
        rule.add({ pc, state: State.after, _pc: pc }, `[for="_pc${pc + 1}"]`, priorityCSS(-2))
        rule.add({ pc, state: State.after, _pc: pc, current: 0 }, `[for="_pc${op[1] + 1}"]`, priorityCSS(-2))
        rule.add({ pc, state: State.after, _pc: ~pc }, `[for="state${State.pcWrite}"]`, priorityCSS(-1))
        break
      case ']':
        rule.add({ pc, state: State.start }, `[for="pc${op[1]}"]`)
        break
      case '+':
        rule.add({ pc, state: State.start }, `[for="state${State.memReadInc}"]`)
        rule.add({ pc, state: State.memReadInc }, `[for="state${State.memWrite}"]`, priorityCSS(-1))
        rule.add({ pc, state: State.memWrite }, `[for="state${State.pcReadNext}"]`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `[for="state${State.pcWrite}"]`, priorityCSS(-1))
        break
      case '-':
        rule.add({ pc, state: State.start }, `[for="state${State.memReadDec}"]`)
        rule.add({ pc, state: State.memReadDec }, `[for="state${State.memWrite}"]`, priorityCSS(-1))
        rule.add({ pc, state: State.memWrite }, `[for="state${State.pcReadNext}"]`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `[for="state${State.pcWrite}"]`, priorityCSS(-1))
        break
      case '>':
        rule.add({ pc, state: State.start }, `[for="state${State.ptrReadInc}"]`)
        rule.add({ pc, state: State.ptrReadInc }, `[for="state${State.ptrWrite}"]`, priorityCSS(-1))
        rule.add({ pc, state: State.ptrWrite }, `[for="state${State.pcReadNext}"]`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `[for="state${State.pcWrite}"]`, priorityCSS(-1))
        break
      case '<':
        rule.add({ pc, state: State.start }, `[for="state${State.ptrReadDec}"]`)
        rule.add({ pc, state: State.ptrReadDec }, `[for="state${State.ptrWrite}"]`)
        rule.add({ pc, state: State.ptrWrite }, `[for="state${State.pcReadNext}"]`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `[for="state${State.pcWrite}"]`, priorityCSS(-1))
        break
      case '.':
        rule.add({ pc, state: State.start }, `[for="state${State.output}"]`)
        rule.add({ pc, state: State.after }, `[for="state${State.pcReadNext}"]`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `[for="state${State.pcWrite}"]`, priorityCSS(-1))
        break
      case ',':
        rule.add({ pc, state: State.start }, `[for="state${State.input}"]`)
        rule.add({ pc, state: State.after }, `[for="state${State.memWrite}"]`)
        rule.add({ pc, state: State.memWrite }, `[for="state${State.pcReadNext}"]`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `[for="state${State.pcWrite}"]`, priorityCSS(-1))
        break
    }
  })
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
    ops[s] = [ops[s], e]
    ops[e] = [ops[e], s]
  })
  return ops
}
class Rule {
  styles = []
  constructor(progSize, memSize) {
    this.progSize = progSize
    this.memSize = memSize
  }
  add({ state, pc, _pc, ptr, _ptr, current }, selector, style = 'display: block;') {
    const { progSize, memSize } = this
    let idx = -1
    const selectors = []
    const positions = [
      [0, 'state', state],
      [stateSize, 'pc', pc],
      [stateSize + progSize, '_pc', _pc],
      [stateSize + progSize * 2, 'ptr', ptr],
      [stateSize + progSize * 2 + memSize, '_ptr', _ptr],
      [stateSize + progSize * 2 + memSize * 2, 'c', current]
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
      const diff = stateSize + 2 * progSize + 2 * memSize + byteSize - idx
      selectors.push(`${new Array(diff).fill('+*').join('')}`) 
    }
    this.styles.push([selectors.join('') + ' ' + selector, style])
  }
  toCSS() {
    return this.styles.map(([selector, style]) => `${selector}{${style}}`).join('\n')
  }
}