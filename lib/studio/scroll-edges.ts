/** Which sides of a sideways-scrolling row still have something hidden past them (a 2 px slack absorbs fractional scroll positions). */
export function scrollEdges(scrollLeft: number, clientWidth: number, scrollWidth: number): { left: boolean; right: boolean } {
  const slack = 2;
  return {
    left: scrollLeft > slack,
    right: scrollLeft + clientWidth < scrollWidth - slack,
  };
}
