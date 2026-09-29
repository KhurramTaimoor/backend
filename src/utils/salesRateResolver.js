const n = (v) => {
  const x = Number(v || 0);
  return Number.isFinite(x) ? x : 0;
};

const same = (a, b) => String(a ?? "") === String(b ?? "");

const assignedIds = (record) => {
  if (Array.isArray(record?.assigned_customer_ids)) {
    return record.assigned_customer_ids.map(String);
  }
  if (Array.isArray(record?.assigned_customers)) {
    return record.assigned_customers
      .map((x) => x?.customer_id ?? x?.id)
      .filter(Boolean)
      .map(String);
  }
  return [];
};

export function resolveSalesRate(
  rates,
  { customerId, productId, categoryId, productTypeId, unitId, rateMode = "retail", listName = "" } = {}
) {
  const customerKey = String(customerId ?? "");
  const requestedList = String(listName || "").trim();

  const candidates = (Array.isArray(rates) ? rates : [])
    .filter((r) => same(r.product_id, productId))
    .filter((r) => {
      if (requestedList) {
        return String(r.list_name || "Default Rate List").trim() === requestedList;
      }
      const directCustomer = r.customer_id ? same(r.customer_id, customerId) : false;
      const listAssignments = assignedIds(r);
      const listAssignedToCustomer = customerKey && listAssignments.includes(customerKey);
      const isGlobal = !r.customer_id && listAssignments.length === 0;
      return directCustomer || listAssignedToCustomer || isGlobal;
    })
    .sort((a, b) => {
      const aAssigned =
        (a.customer_id && same(a.customer_id, customerId)) ||
        assignedIds(a).includes(customerKey)
          ? 1
          : 0;
      const bAssigned =
        (b.customer_id && same(b.customer_id, customerId)) ||
        assignedIds(b).includes(customerKey)
          ? 1
          : 0;
      return bAssigned - aAssigned;
    });

  let best = null;
  let bestScore = -1;

  for (const record of candidates) {
    const options = Array.isArray(record.price_options) ? record.price_options : [];

    for (const opt of options) {
      let score = 0;
      if (categoryId && same(opt.category_id, categoryId)) score += 4;
      else if (opt.category_id && categoryId) continue;

      if (productTypeId && same(opt.product_type_id, productTypeId)) score += 4;
      else if (opt.product_type_id && productTypeId) continue;

      if (unitId && same(opt.unit_id, unitId)) score += 2;
      else if (opt.unit_id && unitId) continue;

      const assigned =
        (record.customer_id && same(record.customer_id, customerId)) ||
        assignedIds(record).includes(customerKey);
      if (requestedList && String(record.list_name || "Default Rate List").trim() === requestedList) score += 20;
      else if (assigned) score += 8;

      if (score > bestScore) {
        bestScore = score;
        best = { record, opt };
      }
    }
  }

  if (!best) return null;

  const modeKey = `${rateMode}_rate`;
  const singleRate = n(best.opt.single_rate);
  const rate =
    (rateMode === "single" ? singleRate : n(best.opt[modeKey])) ||
    n(best.opt.retail_rate) ||
    n(best.opt.wholesale_rate) ||
    n(best.opt.distributor_rate) ||
    singleRate;

  if (!rate && !singleRate) return null;

  return {
    rate: rate || singleRate,
    single_rate: singleRate,
    list_name: best.record.list_name || "Rate List",
    customer_id: best.record.customer_id || null,
    assigned_customer_ids: assignedIds(best.record),
    option: best.opt,
  };
}
