import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Xbensieve E-Commerce API",
      version: "1.0.0",
      description:
        "Elegant API documentation for the Xbensieve e-commerce backend",
    },
  },
  apis: ["./routes/*.js"], // adjust as needed
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
