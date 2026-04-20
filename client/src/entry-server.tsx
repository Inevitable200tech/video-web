// For SSR with React Router v7, we render a minimal template
// The full app will be hydrated and routed on the client side
export async function render(url: string) {
  // Return empty content for server rendering
  // Client-side React will handle all routing and rendering
  return "";
}
