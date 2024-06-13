import { initializeGPU } from './gpu.js'
import vertShaderCode from './shaders/vert.wgsl?raw'
import fragShaderCode from './shaders/frag.wgsl?raw'
import computeShaderCode from './shaders/compute.wgsl?raw'

const FLOAT32_SIZE = Float32Array.BYTES_PER_ELEMENT
const GRID_SIZE = 512
const instanceCount = GRID_SIZE * GRID_SIZE

// prettier-ignore
// Raw vertex data for two triangles that form a square
const vertices = new Float32Array([
    // X,    Y,
    -0.8, -0.8, // Triangle 1
     0.8, -0.8,
     0.8,  0.8,
  
    -0.8, -0.8, // Triangle 2
     0.8,  0.8,
    -0.8,  0.8,
  ]);

const { device, context, canvasFormat } = await initializeGPU('canvas')

// Shader modules
const vertShaderModule = device.createShaderModule({
  label: 'Cell vertex shader',
  code: vertShaderCode,
})

const fragShaderModule = device.createShaderModule({
  label: 'Cell fragment shader',
  code: fragShaderCode,
})

// Create the compute shader that will process the simulation.
const simulationShaderModule = device.createShaderModule({
  label: 'Game of Life simulation shader',
  code: computeShaderCode,
})

// Vertex buffer for the cell vertices
const vertexBuffer = device.createBuffer({
  label: 'Cell vertices',
  size: vertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
})
device.queue.writeBuffer(vertexBuffer, 0, vertices)

// Create a uniform buffer that describes the gridsize
const gridSize = new Float32Array([GRID_SIZE, GRID_SIZE])
const gridSizeBuffer = device.createBuffer({
  label: 'Grid size',
  size: gridSize.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
})
device.queue.writeBuffer(gridSizeBuffer, 0, gridSize)

// Create an array representing the active state of each cell.
const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE)

// Create a pair of storage buffers to hold the cell state.
const cellStateStorage = [
  device.createBuffer({
    label: 'Cell State A',
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }),
  device.createBuffer({
    label: 'Cell State B',
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }),
]

// Mark every third cell of the grid as active.
for (let i = 0; i < cellStateArray.length; i += 1) {
  cellStateArray[i] = Math.random() > 0.6 ? 1 : 0
}
device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray)

// Create the bind group layout and pipeline layout.
const bindGroupLayout = device.createBindGroupLayout({
  label: 'Cell Bind Group Layout',
  entries: [
    {
      binding: 0,
      // Add GPUShaderStage.FRAGMENT here if you are using the `grid` uniform in the fragment shader.
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
      buffer: {}, // Grid uniform buffer
    },
    {
      binding: 1,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
      buffer: { type: 'read-only-storage' }, // Cell state input buffer
    },
    {
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: 'storage' }, // Cell state output buffer
    },
  ],
})

// Bind the uniform buffer to bind group 0
const bindGroups = [
  device.createBindGroup({
    label: 'Cell renderer bind group A',
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: gridSizeBuffer },
      },
      {
        binding: 1,
        resource: { buffer: cellStateStorage[0] },
      },
      {
        binding: 2,
        resource: { buffer: cellStateStorage[1] },
      },
    ],
  }),
  device.createBindGroup({
    label: 'Cell renderer bind group B',
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: gridSizeBuffer },
      },
      {
        binding: 1,
        resource: { buffer: cellStateStorage[1] },
      },
      {
        binding: 2,
        resource: { buffer: cellStateStorage[0] },
      },
    ],
  }),
]

// Render pipeline for the cell
const pipelineLayout = device.createPipelineLayout({
  label: 'Cell Pipeline Layout',
  bindGroupLayouts: [bindGroupLayout],
})

const cellPipeline = device.createRenderPipeline({
  label: 'Cell pipeline',
  layout: pipelineLayout,
  vertex: {
    module: vertShaderModule,
    buffers: [
      {
        arrayStride: 2 * FLOAT32_SIZE, // in bytes
        attributes: [
          {
            format: 'float32x2',
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
          },
        ],
      },
    ],
  },
  fragment: {
    module: fragShaderModule,
    targets: [
      {
        format: canvasFormat,
      },
    ],
  },
})

// Create a compute pipeline that updates the game state.
const simulationPipeline = device.createComputePipeline({
  label: 'Simulation pipeline',
  layout: pipelineLayout,
  compute: {
    module: simulationShaderModule,
  },
})

let step = 0 // Track how many simulation steps have been run
const workgroupCount = Math.ceil(GRID_SIZE / 8)

function update() {
  const encoder = device.createCommandEncoder()

  const computePass = encoder.beginComputePass()
  computePass.setPipeline(simulationPipeline)
  computePass.setBindGroup(0, bindGroups[step % 2])
  computePass.dispatchWorkgroups(workgroupCount, workgroupCount)
  computePass.end()

  step++

  // Clear the canvas
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        clearValue: [0, 0.1, 0.3, 1],
        storeOp: 'store',
      },
    ],
  })

  // Draw the cell
  pass.setPipeline(cellPipeline)
  pass.setVertexBuffer(0, vertexBuffer)
  pass.setBindGroup(0, bindGroups[step % 2])
  pass.draw(vertices.length / 2, instanceCount)
  pass.end()

  device.queue.submit([encoder.finish()])
  requestAnimationFrame(update)
}

requestAnimationFrame(update)
