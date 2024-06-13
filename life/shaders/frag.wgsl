struct FragInput {
  @location(0) cell: vec2f,
  @location(1) grid: vec2f,
};

@fragment
fn main(input: FragInput) -> @location(0) vec4f {
  let c = input.cell / input.grid;
  return vec4f(c, 1.0-c.x, 1.0);
}