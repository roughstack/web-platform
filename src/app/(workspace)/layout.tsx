/**
 * Chrome for the arena: none.
 *
 * The arena is a tool, not a page. It fills the viewport exactly, splits that
 * space between the problem, the editor and the results, and never scrolls as
 * a whole. A global nav and footer would take a fixed bite out of the only
 * dimension the workspace is short of, and the arena's own toolbar already
 * carries the way back out.
 *
 * The height is pinned here rather than in the arena component so the arena
 * can be dropped into a story or a test without inheriting a layout.
 */
export default function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div id="main" className="h-screen overflow-hidden">
      {children}
    </div>
  );
}
