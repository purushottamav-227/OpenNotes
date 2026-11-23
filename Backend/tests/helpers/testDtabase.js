import mongoose from "mongoose";

export async function connectTestDatabase() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "Refusing to run database integration tests outside test mode."
    );
  }

  const uri = process.env.MONGODB_URI;

  if (
    !uri ||
    !uri.includes("opennotes_test")
  ) {
    throw new Error(
      "Refusing to connect: MONGODB_URI must identify the dedicated opennotes_test database."
    );
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });
}

export async function clearTestDatabase() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "Refusing to clear a database outside test mode."
    );
  }

  if (mongoose.connection.name !== "opennotes_test") {
    throw new Error(
      "Refusing to clear a database other than opennotes_test."
    );
  }

  const collections = mongoose.connection.collections;

  await Promise.all(
    Object.values(collections).map((collection) =>
      collection.deleteMany({})
    )
  );
}

export async function disconnectTestDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}