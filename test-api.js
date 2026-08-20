/**
 * 测试API 网关（ifphp）解析 B 站视频链接是否可用。
 *
 * 用法：
 *   node test-api.js <API_KEY> [视频链接]
 *
 * 或通过环境变量传入：
 *   IFPHP_API_KEY=<你的 Key> node test-api.js [视频链接]
 *
 * 示例：
 *   node test-api.js 你的APIKey https://www.bilibili.com/video/BV1544y127KZ
 *   IFPHP_API_KEY=你的APIKey node test-api.js
 */
const API_URL = "https://api-new.ifphp.com/api/svparse";
const DEFAULT_URL = "https://www.bilibili.com/video/BV1544y127KZ";
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function parseArgs() {
  const args = process.argv.slice(2);
  let key = process.env.IFPHP_API_KEY || "";
  let url = DEFAULT_URL;
  for (const arg of args) {
    if (arg.startsWith("--key=")) key = arg.slice("--key=".length);
    else if (arg.startsWith("--url=")) url = arg.slice("--url=".length);
    else if (!key) key = arg;
    else url = arg;
  }
  return { key, url };
}

function stripBackticks(value) {
  return String(value ?? "")
    .replace(/^`+|`+$/g, "")
    .trim();
}

async function main() {
  const { key, url } = parseArgs();
  if (!key) {
    console.error(
      "缺少 API Key。请传入：node test-api.js <API_KEY>，或设置环境变量 IFPHP_API_KEY。",
    );
    process.exit(1);
  }

  const fullUrl = `${API_URL}?url=${encodeURIComponent(url)}`;
  console.log(`请求地址: ${fullUrl}`);
  console.log(`X-API-Key: ${key}`);
  console.log("----------------------------------------\n");

  let response;
  try {
    response = await fetch(fullUrl, {
      headers: { "User-Agent": DEFAULT_UA, "X-API-Key": key },
    });
  } catch (error) {
    console.error("请求失败（网络错误）:", error.message);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`HTTP 请求失败: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log("返回内容（JSON）:");
  console.log(JSON.stringify(data, null, 2));
  console.log("\n----------------------------------------");

  // 按插件 (src/utils.ts processVideoTask) 的解析逻辑逐项校验
  const apiData = data?.data;
  const checks = {
    "code === 200": data?.code === 200,
    "data 存在": !!apiData,
    'data.type === "video"': apiData?.type === "video",
    "data.url 存在": typeof apiData?.url === "string" && apiData.url.length > 0,
    "data.duration 可转为秒数":
      typeof apiData?.duration !== "undefined" &&
      !Number.isNaN(Number(apiData.duration)),
  };

  console.log("校验结果:");
  let allPass = true;
  for (const [name, pass] of Object.entries(checks)) {
    console.log(`  ${pass ? "✔" : "✘"} ${name}`);
    if (!pass) allPass = false;
  }

  if (allPass) {
    console.log("\n全部通过。插件可正常解析该链接。");
    console.log(`视频标题: ${apiData.title || "(无)"}`);
    console.log(`视频直链: ${stripBackticks(apiData.url).slice(0, 80)}...`);
    console.log(`视频时长: ${apiData.duration} 秒`);
  } else {
    console.log("\n存在未通过的校验项，插件将无法解析该链接。");
    console.log(
      "提示：请确认 API Key 正确、链接为 B 站视频（番剧/影视不支持）。",
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("脚本执行出错:", error);
  process.exit(1);
});
