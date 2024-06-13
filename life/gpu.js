/**
 * @type {GPUDevice}
 */
let device

/**
 * @type {GPUCanvasContext}
 */
let context

/**
 * @type {string}
 */
let canvasFormat

/**
 * Initializes the GPU and returns the device and context.
 * @param {string} [selector='canvas'] - The selector for the canvas element.
 * @returns {Promise<{device: GPUDevice, context: GPUCanvasContext}>}
 */
export async function initializeGPU(selector = 'canvas') {
  if (device && context) {
    return {
      device,
      context,
    }
  }

  if (!navigator.gpu) {
    throw new Error('WebGPU not supported on this browser.')
  }

  const adapter = await navigator.gpu.requestAdapter({})
  if (!adapter) {
    throw new Error('No appropriate GPUAdapter found.')
  }

  device = await adapter.requestDevice()
  console.log('GPU device obtained:', device.label || 'Unnamed device')

  const canvas = document.querySelector(selector)
  if (!canvas) {
    throw new Error(`Canvas element not found with selector: ${selector}`)
  }

  context = canvas.getContext('webgpu')
  if (!context) {
    throw new Error('WebGPU not supported on this canvas.')
  }

  canvasFormat = navigator.gpu.getPreferredCanvasFormat()
  console.log(`Canvas details: ${canvas.width}x${canvas.height} ${canvasFormat}`)

  context.configure({
    device,
    format: canvasFormat,
  })

  return {
    device,
    context,
    canvasFormat,
  }
}
