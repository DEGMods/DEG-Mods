const gameFiles = import.meta.glob('../assets/games/*.csv', {
  query: '?raw',
  import: 'default'
})
export default gameFiles
