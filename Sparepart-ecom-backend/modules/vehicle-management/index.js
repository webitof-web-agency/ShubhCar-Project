const vehicleRoutes = require('./routes/vehicle.routes');

const registerVehicleManagementRoutes = (app) => {
  app.use('/v1/vehicle-brands', vehicleRoutes.brandRoutes);
  app.use('/v1/vehicle-models', vehicleRoutes.modelRoutes);
  app.use('/v1/vehicle-years', vehicleRoutes.yearRoutes);
  app.use('/v1/vehicle-model-years', vehicleRoutes.modelYearRoutes);
  app.use('/v1/vehicle-attributes', vehicleRoutes.attributeRoutes);
  app.use('/v1/vehicle-attribute-values', vehicleRoutes.attributeValueRoutes);
  app.use('/v1/vehicle-variants', vehicleRoutes.variantRoutes);
  app.use('/v1/vehicles', vehicleRoutes.vehicleRoutes);
};

module.exports = {
  registerVehicleManagementRoutes,
  vehicleRoutes,
};
