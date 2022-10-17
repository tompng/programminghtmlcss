const baseStyle = `
body{font-family:monospace;}
input {display: none;}
#state, #pc, #_pc, #ptr, #_ptr, #cl, #cu {
  display: inline;
}
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
input[name="cu"]:after,
input[name="cl"]:after {
  position: absolute;
  content: attr(name);
}
#mem{
  border: 1px solid silver;
  height: 40px;
  white-space: nowrap;
  overflow-x: auto;
}
#mem .m{
  display: inline-block;
  width: 32px;
  height: 40px;
  position: relative;
  margin-right: 8px
}
#mem .m input{margin: 0;padding: 0;}
#mem .m .u{position:absolute;width:16px;left:0;}
#mem .m .l{position:absolute;width:16px;right:0;}
#mem .m input:before{width: 16px;}
input[name="state"], input[name="state"]:before{width: 120px;}
input[name="state"]:before{font-size:16px;}
#code{
  border: 1px solid silver;
  margin: 8px 0;
  padding: 8px;
  height: 120px;
}
#code span{
  text-align: center;
  font-size: 16px;
  width: 12px;
  height: 24px;
  line-height: 24px;
  display: inline-block;
}

label{
  display: none;
  position:fixed;
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
  cursor:pointer;
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
  white-space: pre;
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
#output label.ok {
  border-radius: 8px;
  font-size: 40px;
  width: 300px;
  background: #eee;
}

#input:before {
  content: 'input';
}
#input label:before, #output label:before, #input label:after, #output label:after {
  content: none;
}
`

function createRadios(n, name, className) {
  return sequence(n).map(
    (_, value) => createRadio(name, value, value === 0, className)
  ).join('')
}

function createLabels(n, name) {
  return sequence(n).map((_, value) => `<label id="L${name}${value}" for="${name}${value}"></label>`).join('')
}

function createRadio(name, value, checked = false, className = null) {
  return `<input type="radio" id="${name}${value}" name="${name}" value="${value}"${checked ? ' checked' : ''}${className ? ` class="${className}"` : ''}>`
}

function sequence(n) {
  return [...new Array(n)].map((_, v) => v)
}

const halfByteSize = 16
const states = [
  'start', 'jump', 'after',
  'memRead', 'memReadInc', 'memReadDec', 'memWrite',
  'pcReadNext', 'pcWrite',
  'ptrReadInc', 'ptrReadDec', 'ptrWrite',
  'input', 'output', 'writeKB'
]
const State = {}
states.forEach((name, index) => { State[name] = index })
const normalKeys = [
  sequence(16),
  '`1234567890-=',
  '\tqwertyuiop[]\\',
  'asdfghjkl;\'\n',
  'zxcvbnm,./',
  ' '
]
const shiftKeys = [
  sequence(16).map(v => v + 16),
  '~!@#$%^&*()_+',
  '\tQWERTYUIOP{}|',
  'ASDFGHJKL:"\n',
  'ZXCVBNM<>?',
  ' '
]

const stateSize = Object.keys(State).length
function builder(progSize, memSize, code) {
  const rule = new Rule(progSize, memSize)
  const [kbhtml, kbstyle] = createKeyboard()
  const html = [
    '<div id="register">',
    `<div id="state">${createRadios(stateSize, 'state')}</div>`,
    `<div id="pc">${createRadios(progSize, 'pc')}</div>`,
    `<div id="_pc">${createRadios(progSize, '_pc')}</div>`,
    `<div id="ptr">${createRadios(memSize, 'ptr')}</div>`,
    `<div id="_ptr">${createRadios(memSize, '_ptr')}</div>`,
    `<div id="cu">${createRadios(halfByteSize, 'cu')}</div>`,
    `<div id="cl">${createRadios(halfByteSize, 'cl')}</div>`,
    '</div>',
    '<div id="mem">',
    sequence(memSize).map(ptr => {
      const upper = createRadios(halfByteSize, `vu${ptr}-`, 'u')
      const lower = createRadios(halfByteSize, `vl${ptr}-`, 'l')
      return `<div class="m" id="m${ptr}">${upper}${lower}</div>`
    }).join('\n'),
    '</div>',
    '<div id="labels">',
    createLabels(stateSize, 'state'),
    createLabels(progSize, 'pc'),
    createLabels(progSize, '_pc'),
    createLabels(memSize, 'ptr'),
    createLabels(memSize, '_ptr'),
    createLabels(halfByteSize, 'cu'),
    createLabels(halfByteSize, 'cl'),
    sequence(memSize).map(
      ptr => createLabels(halfByteSize, `vu${ptr}-`) + createLabels(halfByteSize, `vl${ptr}-`)
    ).join('\n'),
    '</div>',
    `<div id="output"><div></div><label class="ok" for="state${State.after}">ok</label></div>`,
    kbhtml,
    '</div>',
    [
      '<div id="code">',
      sequence(progSize).map(pc => `<span id="c${pc}">${code[pc] ?? '&nbsp;'}</span>`).join(''),
      '</div>'
    ].join(''),
    '</div>'
  ].join('\n')
  return { html, rule, kbstyle }
}
function createKeyboard() {
  const converts = { '\n': '⏎', '&': '&amp;', '<': '&lt;', '>': '&gt;', ' ': 'space', '\t': 'tab' }
  const styles = []
  const emptyLabel = (size) => `<label class="KLsp${size} KLnone"></label>`
  const keysHTML = [normalKeys, shiftKeys].map((lines, isShift) => {
    const lineHTML = lines.map((line, h) => {
      const html = [...line].map(key => {
        const hex = typeof key === 'number'
        const code = hex ? key : key.charCodeAt(0)
        const text = hex ? (256 + key).toString(16).toUpperCase().substring(1) : converts[key] ?? key
        return `<label class="KL${code}${hex ? ' Khex' : ''}" for="K${code}">${text}</label>`
      }).join('')
      const lefts = []
      const rights = []
      if (h == 1) rights.push(emptyLabel(2))
      if (h == 3) lefts.push(emptyLabel(3))
      if (h == 4) {
        const shift = '<label class="KLsp4" for="Kshift">shift</label>'
        lefts.push(shift)
        rights.push(shift)
      }
      if (h == 5) {
        lefts.push(emptyLabel(4))
        rights.push(`<label class="ok KLsp5" for="state${State.writeKB}">OK</label>`)
      }
      return `<div>${lefts.join('')}${html}${rights.join('')}</div>`
    }).join('\n')
    return [
      `<div class="keyboard keyboard-${isShift ? 'shift' : 'normal'}">`,
      lineHTML,
      '</div>'
    ].join('\n')
  }).join('\n')
  const html = [
    '<div id="kb">',
    sequence(128).map(v => `<input id="K${v}" name="key" type="radio">`).join(''),
    '<div id="input">',
    '<input name="shift" id="Kshift" type="checkbox">',
    keysHTML,
    '</div>',
    '<div id="kblabels">',
    sequence(halfByteSize).map(v => `<label id="KLcu${v}" for="cu${v}"></label>`).join(''),
    sequence(halfByteSize).map(v => `<label id="KLcl${v}" for="cl${v}"></label>`).join(''),
    '</div>',
    '</div>'
  ].join('\n')
  styles.push('#kb{height:0;overflow:hidden;}')
  styles.push('#input label{width: 32px;height: 32px;font-size:20px;line-height:32px;margin:4px;box-shadow: 0 0 1px gray}')
  styles.push('#input #Kshift{width:0;height:0;position:absolute}')
  styles.push('#input #Kshift:checked+.keyboard-normal{display:none;}')
  styles.push('#input #Kshift:not(:checked)+*+.keyboard-shift{display:none;}')
  styles.push('#input label.Khex{font-size:16px;width:28px;}')
  styles.push('#input .KLsp2, #input .KL9{width:54px;}')
  styles.push('#input .KLsp3, #input .KL10{width:64px;}')
  styles.push('#input .KLsp4{width:88px;}')
  styles.push('#input .KLsp5{width:128px;}')
  styles.push('#input .KLnone{cursor:auto}')
  styles.push('#input .KL32{width:224px;}')
  styles.push('#input .ok{font-size: 20px;background: #aac;}')
  styles.push('#input .keyboard div{display:flex;justify-content:space-between;;width:610px;margin: 0 auto;}')
  for (const code of sequence(128)) {
    styles.push(`#kb:has(#K${code}:checked) #input .KL${code}{background:gray;color:white;}`)
  }
  return [html, styles.join('\n')]
}

function addKeyboardRules(rule) {
  for (const code of sequence(128)) {
    const base = `#kb:has(#K${code}:checked) #kblabels`
    rule.add({ state: State.writeKB, cu: ~(code >> 4) }, `${base} #KLcu${code >> 4}`)
    rule.add({ state: State.writeKB, cl: ~(code & 0xf) }, `${base} #KLcl${code & 0xf}`)
  }
}

function generate(code, memSize = 8) {
  const operations = parseBF(code)
  const compactCode = operations.map(op => op[0])
  const progSize = operations.length + 1
  const { html, rule, kbstyle } = builder(progSize, memSize, compactCode)
  for (let pc of sequence(progSize)) {
    rule.add({ state: State.pcReadNext, pc, _pc: ~(pc + 1) }, `#L_pc${pc + 1}`)
    rule.add({ state: State.pcWrite, pc: ~pc, _pc: pc }, `#Lpc${pc}`)
    rule.add({ pc: pc }, `#c${pc}`, 'background:#faa')
  }
  for (let ptr of sequence(memSize)) {
    rule.add({ state: State.ptrReadDec, ptr, _ptr: ~(ptr - 1) }, `#L_ptr${ptr - 1}`)
    rule.add({ state: State.ptrReadInc, ptr, _ptr: ~(ptr + 1) }, `#L_ptr${ptr + 1}`)
    rule.add({ state: State.ptrWrite, _ptr: ptr, ptr: ~ptr }, `#Lptr${ptr}`)
    rule.add({ ptr }, `#m${ptr} input:checked:before`, 'background:#faa')
    for (let value of sequence(halfByteSize)) {
      const nextValue = (value + 1) % halfByteSize
      const prefix = `#L${ptr}`
      rule.add({ state: State.memWrite, ptr, cu: value, [`vu${ptr}-`]: ~value }, `#Lvu${ptr}-${value}`)
      rule.add({ state: State.memWrite, ptr, cl: value, [`vl${ptr}-`]: ~value }, `#Lvl${ptr}-${value}`)
      rule.add({ state: State.memRead, ptr, cu: ~value, [`vu${ptr}-`]: value }, `#Lcu${value}`)
      rule.add({ state: State.memRead, ptr, cl: ~value, [`vl${ptr}-`]: value }, `#Lcl${value}`)
      rule.add({ state: State.memReadInc, ptr, cl: ~nextValue, [`vl${ptr}-`]: value }, `#Lcl${nextValue}`, priorityCSS(1))
      rule.add({ state: State.memReadInc, ptr, cu: ~nextValue, cl: 0, [`vu${ptr}-`]: value }, `#Lcu${nextValue}`)
      rule.add({ state: State.memReadInc, ptr, cu: ~value, cl: ~0, [`vu${ptr}-`]: value }, `#Lcu${value}`)
      rule.add({ state: State.memReadDec, ptr, cl: ~value, [`vl${ptr}-`]: nextValue }, `#Lcl${value}`, priorityCSS(1))
      rule.add({ state: State.memReadDec, ptr, cu: ~value, cl: halfByteSize - 1, [`vu${ptr}-`]: nextValue }, `#Lcu${value}`)
      rule.add({ state: State.memReadDec, ptr, cu: ~nextValue, cl: ~(halfByteSize - 1), [`vu${ptr}-`]: nextValue }, `#Lcu${nextValue}`)
    }
  }
  rule.add({ state: State.writeKB }, `#Lstate${State.after}`)
  rule.add({ state: State.output }, '#output')
  for (let currentU of sequence(halfByteSize)) {
    for (let currentL of sequence(halfByteSize)) {
      const code = (currentU << 4) | currentL
      const hex = `${currentU.toString(16)}${currentL.toString(16)}`.toUpperCase()
      const content = code <= 32 || code >= 127 ? `0x${hex}` : `\\${hex}  (0x${hex})`
      rule.add({ state: State.output, cu: currentU, cl: currentL }, '#output div:after', `content: "${content}"`)
    }
  }
  rule.add({ state: State.input }, '#input')
  addKeyboardRules(rule)
  addBFRules(rule, operations)
  return ['<html><head><meta charset="utf-8"><style>', baseStyle, kbstyle, rule.toCSS(), createDesignStyle(), '</style></style></head><body>', html, '</body>'].join('\n')
}

function priorityCSS(priority) {
  return `display:block;z-index:${100 + priority}`
}

function addBFRules(rule, operations) {
  rule.add({ state: State.pcWrite }, `#Lstate${State.start}`, priorityCSS(-10))
  operations.forEach((op, pc) => {
    switch(op[0]) {
      case '[':
        rule.add({ pc, state: State.start }, `#Lstate${State.memRead}`)
        rule.add({ pc, state: State.memRead }, `#Lstate${State.jump}`, priorityCSS(-1))
        rule.add({ pc, state: State.jump, _pc: ~pc }, `#L_pc${pc}`)
        rule.add({ pc, state: State.jump, _pc: pc }, `#Lstate${State.after}`)
        rule.add({ pc, state: State.after, _pc: pc }, `#L_pc${pc + 1}`, priorityCSS(-2))
        rule.add({ pc, state: State.after, _pc: pc, cu: 0, cl: 0 }, `#L_pc${op[1] + 1}`, priorityCSS(-2))
        rule.add({ pc, state: State.after, _pc: ~pc }, `#Lstate${State.pcWrite}`, priorityCSS(-1))
        break
      case ']':
        rule.add({ pc, state: State.start }, `#Lpc${op[1]}`)
        break
      case '+':
        rule.add({ pc, state: State.start }, `#Lstate${State.memReadInc}`)
        rule.add({ pc, state: State.memReadInc }, `#Lstate${State.memWrite}`, priorityCSS(-1))
        rule.add({ pc, state: State.memWrite }, `#Lstate${State.pcReadNext}`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `#Lstate${State.pcWrite}`, priorityCSS(-1))
        break
      case '-':
        rule.add({ pc, state: State.start }, `#Lstate${State.memReadDec}`)
        rule.add({ pc, state: State.memReadDec }, `#Lstate${State.memWrite}`, priorityCSS(-1))
        rule.add({ pc, state: State.memWrite }, `#Lstate${State.pcReadNext}`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `#Lstate${State.pcWrite}`, priorityCSS(-1))
        break
      case '>':
        rule.add({ pc, state: State.start }, `#Lstate${State.ptrReadInc}`)
        rule.add({ pc, state: State.ptrReadInc }, `#Lstate${State.ptrWrite}`, priorityCSS(-1))
        rule.add({ pc, state: State.ptrWrite }, `#Lstate${State.pcReadNext}`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `#Lstate${State.pcWrite}`, priorityCSS(-1))
        break
      case '<':
        rule.add({ pc, state: State.start }, `#Lstate${State.ptrReadDec}`)
        rule.add({ pc, state: State.ptrReadDec }, `#Lstate${State.ptrWrite}`)
        rule.add({ pc, state: State.ptrWrite }, `#Lstate${State.pcReadNext}`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `#Lstate${State.pcWrite}`, priorityCSS(-1))
        break
      case '.':
        rule.add({ pc, state: State.start }, `#Lstate${State.memRead}`)
        rule.add({ pc, state: State.memRead }, `#Lstate${State.output}`, priorityCSS(-1))
        rule.add({ pc, state: State.after }, `#Lstate${State.pcReadNext}`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `#Lstate${State.pcWrite}`, priorityCSS(-1))
        break
      case ',':
        rule.add({ pc, state: State.start }, `#Lstate${State.input}`)
        rule.add({ pc, state: State.after }, `#Lstate${State.memWrite}`)
        rule.add({ pc, state: State.memWrite }, `#Lstate${State.pcReadNext}`, priorityCSS(-1))
        rule.add({ pc, state: State.pcReadNext }, `#Lstate${State.pcWrite}`, priorityCSS(-1))
        break
    }
  })
}

function createDesignStyle() {
  const styles = []
  for (const value of sequence(16)) {
    const selector = ['input[name="cu"]', 'input[name="cl"]', '#mem input'].map(s => `${s}[value="${value}"]:before`).join(',')
    styles.push(`${selector}{content:"${value.toString(16).toUpperCase()}";}`)
  }
  for (const name in State) {
    styles.push(`input[name="state"][value="${State[name]}"]:before{content:"${name}";}`)
  }
  return styles.join('\n')
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
  add(options, selector, style = 'display: block;') {
    const selectors = []
    for (const key in options) {
      const value = options[key]
      if (value == null) continue
      const v = value >= 0 ? value : ~value
      const mode = value >= 0 ? 'checked' : 'not(:checked)'
      selectors.push(`:has(#${key}${v}:${mode})`)
    }
    if (selectors.length) {
      selectors.unshift('body')
      selectors.push(' ')
    }
    this.styles.push([selectors.join('') + selector, style])
  }
  toCSS() {
    return this.styles.map(([selector, style]) => `${selector}{${style}}`).join('\n')
  }
}
