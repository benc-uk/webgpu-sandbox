(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))h(t);new MutationObserver(t=>{for(const l of t)if(l.type==="childList")for(const f of l.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&h(f)}).observe(document,{childList:!0,subtree:!0});function n(t){const l={};return t.integrity&&(l.integrity=t.integrity),t.referrerPolicy&&(l.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?l.credentials="include":t.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function h(t){if(t.ep)return;t.ep=!0;const l=n(t);fetch(t.href,l)}})();let a,c,d;async function C(r="canvas"){if(a&&c)return{device:a,context:c};if(!navigator.gpu)throw new Error("WebGPU not supported on this browser.");const i=await navigator.gpu.requestAdapter({});if(!i)throw new Error("No appropriate GPUAdapter found.");a=await i.requestDevice(),console.log("GPU device obtained:",a.label||"Unnamed device");const n=document.querySelector(r);if(!n)throw new Error(`Canvas element not found with selector: ${r}`);if(c=n.getContext("webgpu"),!c)throw new Error("WebGPU not supported on this canvas.");return d=navigator.gpu.getPreferredCanvasFormat(),console.log(`Canvas details: ${n.width}x${n.height} ${d}`),c.configure({device:a,format:d}),{device:a,context:c,canvasFormat:d}}const G=`struct VertexInput {
  @location(0) pos: vec2f,
  @builtin(instance_index) instance: u32,
};

struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) cell: vec2f,
  @location(1) grid: vec2f,
};

@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellState: array<u32>; 

@vertex
fn main(input: VertexInput) -> VertexOutput {
  let i = f32(input.instance);
  let state = f32(cellState[input.instance]); // New line!

  let cell = vec2f(i % grid.x, floor(i / grid.x));
  let cellOffset = cell / grid * 2.0; 
  let gridPos = (input.pos * state + 1.0) / grid - 1.0 + cellOffset;
  
  var output: VertexOutput;
  output.pos = vec4f(gridPos, 0.0, 1.0);
  output.cell = cell;
  output.grid = grid;
  return output;
}`,U=`struct FragInput {
  @location(0) cell: vec2f,
  @location(1) grid: vec2f,
};

@fragment
fn main(input: FragInput) -> @location(0) vec4f {
  let c = input.cell / input.grid;
  return vec4f(c, 1.0-c.x, 1.0);
}`,O=`@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellStateIn: array<i32>;
@group(0) @binding(2) var<storage, read_write> cellStateOut: array<i32>;

// New function   
fn cellIndex(cell: vec2u) -> u32 {
  return (cell.y % u32(grid.y)) * u32(grid.x) + (cell.x % u32(grid.x));
}

fn cellActive(x: u32, y: u32) -> i32 {
  return cellStateIn[cellIndex(vec2(x, y))];
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) cell: vec3u) {
  let activeNeighbors = cellActive(cell.x + 1, cell.y + 1) +
                      cellActive(cell.x + 1, cell.y) +
                      cellActive(cell.x + 1, cell.y - 1) +
                      cellActive(cell.x, cell.y - 1) +
                      cellActive(cell.x - 1, cell.y - 1) +
                      cellActive(cell.x - 1, cell.y) +
                      cellActive(cell.x - 1, cell.y + 1) +
                      cellActive(cell.x, cell.y + 1);

let i = cellIndex(cell.xy);

// Conway's game of life rules:
switch activeNeighbors {
  case 2: { // Active cells with 2 neighbors stay active.
    cellStateOut[i] = cellStateIn[i];
  }
  case 3: { // Cells with 3 neighbors become or stay active.
    cellStateOut[i] = 1;
  }
  // high life variant
  case 6: { // Cells with 6 neighbors become or stay active.
    cellStateOut[i] = 1;
  }
  default: { // Cells with < 2 or > 3 neighbors become inactive.
    cellStateOut[i] = 0;
  }
}
}`,A=Float32Array.BYTES_PER_ELEMENT,o=800,B=o*o,v=new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),{device:e,context:E,canvasFormat:L}=await C("canvas"),T=e.createShaderModule({label:"Cell vertex shader",code:G}),F=e.createShaderModule({label:"Cell fragment shader",code:U}),I=e.createShaderModule({label:"Game of Life simulation shader",code:O}),S=e.createBuffer({label:"Cell vertices",size:v.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(S,0,v);const P=new Float32Array([o,o]),p=e.createBuffer({label:"Grid size",size:P.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(p,0,P);const s=new Uint32Array(o*o),u=[e.createBuffer({label:"Cell State A",size:s.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),e.createBuffer({label:"Cell State B",size:s.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST})];for(let r=0;r<s.length;r+=1)s[r]=Math.random()>.95?1:0;e.queue.writeBuffer(u[0],0,s);const b=e.createBindGroupLayout({label:"Cell Bind Group Layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.COMPUTE|GPUShaderStage.FRAGMENT,buffer:{}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}]}),y=[e.createBindGroup({label:"Cell renderer bind group A",layout:b,entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:u[0]}},{binding:2,resource:{buffer:u[1]}}]}),e.createBindGroup({label:"Cell renderer bind group B",layout:b,entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:u[1]}},{binding:2,resource:{buffer:u[0]}}]})],x=e.createPipelineLayout({label:"Cell Pipeline Layout",bindGroupLayouts:[b]}),M=e.createRenderPipeline({label:"Cell pipeline",layout:x,vertex:{module:T,buffers:[{arrayStride:2*A,attributes:[{format:"float32x2",offset:0,shaderLocation:0}]}]},fragment:{module:F,targets:[{format:L}]}}),_=e.createComputePipeline({label:"Simulation pipeline",layout:x,compute:{module:I}});let g=0;const m=Math.ceil(o/8);function w(){const r=e.createCommandEncoder(),i=r.beginComputePass();i.setPipeline(_),i.setBindGroup(0,y[g%2]),i.dispatchWorkgroups(m,m),i.end(),g++;const n=r.beginRenderPass({colorAttachments:[{view:E.getCurrentTexture().createView(),loadOp:"clear",clearValue:[0,.1,.3,1],storeOp:"store"}]});n.setPipeline(M),n.setVertexBuffer(0,S),n.setBindGroup(0,y[g%2]),n.draw(v.length/2,B),n.end(),e.queue.submit([r.finish()]),requestAnimationFrame(w)}requestAnimationFrame(w);
