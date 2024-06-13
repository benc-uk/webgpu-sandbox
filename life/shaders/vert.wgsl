struct VertexInput {
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
}