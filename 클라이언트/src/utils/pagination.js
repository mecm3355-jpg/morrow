function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second)
  const items = []

  pages.forEach((page, index) => {
    const previousPage = pages[index - 1]
    if (previousPage && page - previousPage > 1) items.push(`ellipsis-${previousPage}`)
    items.push(page)
  })

  return items
}

export { getPaginationItems }
