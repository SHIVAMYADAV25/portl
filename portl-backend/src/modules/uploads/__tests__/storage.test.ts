import { getStorageDriver, buildUploader } from "../storage";

describe("getStorageDriver", () => {
  const original = process.env.STORAGE_DRIVER;
  afterEach(() => {
    process.env.STORAGE_DRIVER = original;
  });

  it("defaults to local when unset", () => {
    delete process.env.STORAGE_DRIVER;
    expect(getStorageDriver()).toBe("local");
  });

  it("defaults to local for an unrecognized value", () => {
    process.env.STORAGE_DRIVER = "dropbox";
    expect(getStorageDriver()).toBe("local");
  });

  it("recognizes s3", () => {
    process.env.STORAGE_DRIVER = "s3";
    expect(getStorageDriver()).toBe("s3");
  });

  it("recognizes cloudinary case-insensitively", () => {
    process.env.STORAGE_DRIVER = "Cloudinary";
    expect(getStorageDriver()).toBe("cloudinary");
  });
});

describe("buildUploader — misconfiguration errors", () => {
  const original = process.env.STORAGE_DRIVER;
  afterEach(() => {
    process.env.STORAGE_DRIVER = original;
    delete process.env.S3_BUCKET;
    delete process.env.S3_REGION;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });

  it("throws a clear error if STORAGE_DRIVER=s3 but S3_BUCKET/S3_REGION are missing", () => {
    process.env.STORAGE_DRIVER = "s3";
    expect(() => buildUploader("/tmp/uploads")).toThrow(/S3_BUCKET/);
  });

  it("throws a clear error if STORAGE_DRIVER=cloudinary but credentials are missing", () => {
    process.env.STORAGE_DRIVER = "cloudinary";
    expect(() => buildUploader("/tmp/uploads")).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });

  it("builds a local uploader with no extra config required", () => {
    process.env.STORAGE_DRIVER = "local";
    const { upload, getUrl } = buildUploader("/tmp/uploads");
    expect(upload).toBeDefined();
    expect(typeof getUrl).toBe("function");
  });
});
