import {
  readJsonFile,
  writeJsonFile,
  updateJsonFile,
} from "@/infrastructure/database/jsonDb";
import fs from "fs/promises";
import path from "path";

/**
 * JSON 資料庫測試
 * 測試重點：
 * 1. 並發讀寫不會造成死鎖
 * 2. 檔案鎖定機制正常運作
 * 3. 讀取不存在的檔案回傳空陣列
 */

const TEST_DATA_DIR = path.join(process.cwd(), "tests", "fixtures", "temp");
const TEST_FILE_PATH = path.join(TEST_DATA_DIR, "test-db.json");

interface TestUser {
  id: string;
  name: string;
}

describe("jsonDb - 檔案操作", () => {
  beforeEach(async () => {
    // 確保測試目錄存在
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
  });

  afterEach(async () => {
    // 清理測試檔案
    try {
      await fs.unlink(TEST_FILE_PATH);
    } catch (error) {
      // 檔案可能不存在，忽略錯誤
    }
  });

  afterAll(async () => {
    // 清理測試目錄
    try {
      await fs.rmdir(TEST_DATA_DIR);
    } catch (error) {
      // 目錄可能不存在，忽略錯誤
    }
  });

  describe("readJsonFile", () => {
    it("應該讀取不存在的檔案時回傳空陣列", async () => {
      const result = await readJsonFile<TestUser>(TEST_FILE_PATH);
      expect(result).toEqual([]);
    });

    it("應該正確讀取 JSON 檔案", async () => {
      const testData: TestUser[] = [
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
      ];
      await fs.writeFile(TEST_FILE_PATH, JSON.stringify(testData, null, 2));

      const result = await readJsonFile<TestUser>(TEST_FILE_PATH);
      expect(result).toEqual(testData);
    });
  });

  describe("writeJsonFile", () => {
    it("應該正確寫入 JSON 檔案", async () => {
      const testData: TestUser[] = [
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
      ];

      await writeJsonFile(TEST_FILE_PATH, testData);

      const fileContent = await fs.readFile(TEST_FILE_PATH, "utf-8");
      const parsedData = JSON.parse(fileContent);
      expect(parsedData).toEqual(testData);
    });

    it("應該自動建立不存在的目錄", async () => {
      const deepPath = path.join(
        TEST_DATA_DIR,
        "level1",
        "level2",
        "test.json"
      );
      const testData: TestUser[] = [{ id: "1", name: "User 1" }];

      await writeJsonFile(deepPath, testData);

      const fileContent = await fs.readFile(deepPath, "utf-8");
      const parsedData = JSON.parse(fileContent);
      expect(parsedData).toEqual(testData);

      // 清理
      await fs.unlink(deepPath);
      await fs.rmdir(path.join(TEST_DATA_DIR, "level1", "level2"));
      await fs.rmdir(path.join(TEST_DATA_DIR, "level1"));
    });
  });

  describe("updateJsonFile", () => {
    it("應該正確更新 JSON 檔案", async () => {
      const initialData: TestUser[] = [
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
      ];
      await writeJsonFile(TEST_FILE_PATH, initialData);

      await updateJsonFile<TestUser>(TEST_FILE_PATH, (users) => [
        ...users,
        { id: "3", name: "User 3" },
      ]);

      const result = await readJsonFile<TestUser>(TEST_FILE_PATH);
      expect(result).toHaveLength(3);
      expect(result[2]).toEqual({ id: "3", name: "User 3" });
    });

    it("應該處理空檔案的更新", async () => {
      await updateJsonFile<TestUser>(TEST_FILE_PATH, (users) => [
        ...users,
        { id: "1", name: "User 1" },
      ]);

      const result = await readJsonFile<TestUser>(TEST_FILE_PATH);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: "1", name: "User 1" });
    });

    it("應該避免死鎖 - 不應該在 updateJsonFile 內部重複呼叫 readJsonFile", async () => {
      // 這個測試確保 updateJsonFile 不會造成死鎖
      // 如果有死鎖，這個測試會超時
      const initialData: TestUser[] = [{ id: "1", name: "User 1" }];
      await writeJsonFile(TEST_FILE_PATH, initialData);

      const updatePromise = updateJsonFile<TestUser>(
        TEST_FILE_PATH,
        (users) => [...users, { id: "2", name: "User 2" }]
      );

      // 設定 5 秒超時
      await expect(
        Promise.race([
          updatePromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Timeout - possible deadlock")),
              5000
            )
          ),
        ])
      ).resolves.toBeUndefined();
    });
  });

  describe("並發操作", () => {
    it("應該正確處理並發寫入操作", async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        updateJsonFile<TestUser>(TEST_FILE_PATH, (users) => [
          ...users,
          { id: String(i + 1), name: `User ${i + 1}` },
        ])
      );

      await Promise.all(promises);

      const result = await readJsonFile<TestUser>(TEST_FILE_PATH);
      expect(result).toHaveLength(10);

      // 確認所有使用者都存在
      const ids = result.map((u) => u.id).sort();
      expect(ids).toEqual(["1", "10", "2", "3", "4", "5", "6", "7", "8", "9"]);
    });

    it("應該正確處理並發讀寫操作", async () => {
      const initialData: TestUser[] = [
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
      ];
      await writeJsonFile(TEST_FILE_PATH, initialData);

      const writePromises = Array.from({ length: 5 }, (_, i) =>
        updateJsonFile<TestUser>(TEST_FILE_PATH, (users) => [
          ...users,
          { id: String(i + 3), name: `User ${i + 3}` },
        ])
      );

      const readPromises = Array.from({ length: 5 }, () =>
        readJsonFile<TestUser>(TEST_FILE_PATH)
      );

      await Promise.all([...writePromises, ...readPromises]);

      const result = await readJsonFile<TestUser>(TEST_FILE_PATH);
      expect(result).toHaveLength(7); // 2 initial + 5 new
    });
  });

  describe("錯誤處理", () => {
    it("應該處理無效的 JSON 格式", async () => {
      await fs.writeFile(TEST_FILE_PATH, "{ invalid json }");

      // jsonDb 對於損壞/無效 JSON 會容錯回傳空陣列，避免整個流程被中斷
      await expect(readJsonFile<TestUser>(TEST_FILE_PATH)).resolves.toEqual([]);
    });
  });
});
