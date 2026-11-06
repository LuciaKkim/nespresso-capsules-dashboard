import fs from "fs";

const html = fs.readFileSync(process.argv[2], "utf8");
const marker = 'window.ui.push({"id":"respProductListPLPCapsule';
const start = html.indexOf(marker);
if (start === -1) {
  console.error("ProductList block not found");
  process.exit(1);
}
const jsonStart = html.indexOf("{", start + "window.ui.push(".length);
let depth = 0;
let end = jsonStart;
for (; end < html.length; end++) {
  const ch = html[end];
  if (ch === "{") depth++;
  else if (ch === "}") {
    depth--;
    if (depth === 0) break;
  }
}
const payload = JSON.parse(html.slice(jsonStart, end + 1));
const props = payload.configuration?.props ?? {};
console.log("prop keys:", Object.keys(props));
const list =
  props.products ??
  props.productList ??
  props.items ??
  props.list ??
  props.catalog?.products;
if (Array.isArray(list)) {
  console.log("count:", list.length);
  console.log(JSON.stringify(list[0], null, 2).slice(0, 2000));
} else {
  // dump shallow structure
  for (const [k, v] of Object.entries(props)) {
    console.log(k, Array.isArray(v) ? `array(${v.length})` : typeof v);
  }
}
