function getMessage(err) {
  const data = getData(err);
  const msg =
    (data && (data.message || data.error || data.title)) || (err && err.message) || "";
  return String(msg || "");
}
