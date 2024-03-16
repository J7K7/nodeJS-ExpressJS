

class ProductAllDetails {
    constructor(productId, productName,productDescription, advanceBookingDuration, active_fromDate, active_toDate) {
      this.productId = productId;
      this.productName = productName;
      this.productDescription = productDescription;
      this.advanceBookingDuration = advanceBookingDuration;
      this.active_fromDate = active_fromDate;
      this.active_toDate = active_toDate;
      this.images = [];
      this.features = [];
      this.slots=[];// for future Need 
    }
  
    addImage(imageId, imagePath) {
      this.images.push({ imageId, imagePath });
    }
  
    addFeature(featureId, featureName, featureDescription) {
      this.features.push({ featureId, featureName, featureDescription });
    }
    // here need to add addSlot

    hasImage(imageId) {
        return this.images.some(image => image.imageId === imageId);
    }

    hasFeature(featureId) {
        return this.features.some(feature => feature.featureId === featureId);
    }
  }
  
  module.exports = ProductAllDetails;
  