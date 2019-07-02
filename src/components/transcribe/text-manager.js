
// export default class TextManager {
//   constructor (data) {
//     this.data = data
//     this._regionMap = {}
//     this._mapRegions()
//     this._mapTextByRegion()
//   }

//   _mapRegions() {
//     this.data.regions.forEach((region) => {
//       this._regionMap[region.id] = {
//         ...region,
//         items: []
//       }
//     })
//   }

//   _mapTextByRegion() {
//     this.data.content.forEach((item) => {
//       this._regionMap[item.region].items.push(item)
//     })
//   }

//   get mappedItems () {
//     return this._regionMap
//   }
// }