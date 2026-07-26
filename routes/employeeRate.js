const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value) =>
  Number(toNumber(value).toFixed(2));

const normalizeStatus = (status) =>
  String(status || "Pending").toLowerCase() ===
  "paid"
    ? "Paid"
    : "Pending";

const validateMonth = (value) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(
    String(value || "")
  );

const calculateSalary = ({
  basic_salary,
  extra_days,
  absent_days,
  time_deduction_hours,
  time_deduction_rate,
  overtime_hours,
  overtime_rate,
  advance,
  previous_advance,
}) => {
  const basicSalary = toNumber(basic_salary);
  const perDaySalary = basicSalary / 30;

  const extraDays = toNumber(extra_days);
  const extraDayAmount =
    extraDays * perDaySalary;

  const absentDays = toNumber(absent_days);
  const absentAmount =
    absentDays * perDaySalary;

  const timeDeductionHours = toNumber(
    time_deduction_hours
  );
  const timeDeductionRate = toNumber(
    time_deduction_rate
  );
  const timeDeductionAmount =
    timeDeductionHours * timeDeductionRate;

  const overtimeHours = toNumber(
    overtime_hours
  );
  const overtimeRate = toNumber(
    overtime_rate
  );
  const overtimeAmount =
    overtimeHours * overtimeRate;

  const currentAdvance = toNumber(advance);
  const previousAdvance = toNumber(
    previous_advance
  );
  const totalAdvance =
    currentAdvance + previousAdvance;

  const calculatedAmount =
    basicSalary +
    extraDayAmount +
    overtimeAmount -
    absentAmount -
    timeDeductionAmount;

  const remainingBalance =
    calculatedAmount - totalAdvance;

  return {
    basic_salary: roundMoney(basicSalary),
    per_day_salary: roundMoney(perDaySalary),

    extra_days: roundMoney(extraDays),
    extra_day_amount:
      roundMoney(extraDayAmount),

    absent_days: roundMoney(absentDays),
    absent_amount: roundMoney(absentAmount),

    time_deduction_hours:
      roundMoney(timeDeductionHours),
    time_deduction_rate:
      roundMoney(timeDeductionRate),
    time_deduction_amount:
      roundMoney(timeDeductionAmount),

    overtime_hours:
      roundMoney(overtimeHours),
    overtime_rate:
      roundMoney(overtimeRate),
    overtime_amount:
      roundMoney(overtimeAmount),

    calculated_amount:
      roundMoney(calculatedAmount),

    advance: roundMoney(currentAdvance),
    previous_advance:
      roundMoney(previousAdvance),
    total_advance: roundMoney(totalAdvance),

    remaining_balance:
      roundMoney(remainingBalance),
  };
};

const baseSelect = `
  SELECT
    es.*,
    e.full_name AS employee_name,
    e.designation,
    e.basic_salary AS registered_basic_salary
  FROM employee_rates es
  INNER JOIN employees e
    ON e.id = es.employee_id
`;

const getSalaryById = async (id) => {
  const rows = await query(
    `${baseSelect}
     WHERE es.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
};

router.get("/", async (req, res) => {
  try {
    const rows = await query(
      `${baseSelect}
       ORDER BY es.salary_month DESC,
                es.id DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error(
      "GET employee salary error:",
      error
    );

    res.status(500).json({
      message:
        "Employee salary records could not be loaded.",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const salary = await getSalaryById(
      req.params.id
    );

    if (!salary) {
      return res.status(404).json({
        message: "Salary record not found.",
      });
    }

    res.json(salary);
  } catch (error) {
    console.error(
      "GET employee salary detail error:",
      error
    );

    res.status(500).json({
      message:
        "Employee salary detail could not be loaded.",
      error: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      employee_id,
      salary_month,
      status,
      notes,
    } = req.body;

    if (
      !employee_id ||
      !validateMonth(salary_month)
    ) {
      return res.status(400).json({
        message:
          "employee_id and salary_month (YYYY-MM) are required.",
      });
    }

    const employees = await query(
      `SELECT id, basic_salary
       FROM employees
       WHERE id = ?
       LIMIT 1`,
      [employee_id]
    );

    if (!employees.length) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    const registeredSalary = toNumber(
      employees[0].basic_salary
    );

    const basicSalary =
      toNumber(req.body.basic_salary) > 0
        ? toNumber(req.body.basic_salary)
        : registeredSalary;

    if (basicSalary <= 0) {
      return res.status(400).json({
        message:
          "Basic salary must be greater than zero.",
      });
    }

    const values = calculateSalary({
      ...req.body,
      basic_salary: basicSalary,
    });

    const result = await query(
      `INSERT INTO employee_rates (
        employee_id,
        salary_month,
        basic_salary,
        per_day_salary,
        extra_days,
        extra_day_amount,
        absent_days,
        absent_amount,
        time_deduction_hours,
        time_deduction_rate,
        time_deduction_amount,
        overtime_hours,
        overtime_rate,
        overtime_amount,
        calculated_amount,
        advance,
        previous_advance,
        total_advance,
        remaining_balance,
        status,
        notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        employee_id,
        salary_month,
        values.basic_salary,
        values.per_day_salary,
        values.extra_days,
        values.extra_day_amount,
        values.absent_days,
        values.absent_amount,
        values.time_deduction_hours,
        values.time_deduction_rate,
        values.time_deduction_amount,
        values.overtime_hours,
        values.overtime_rate,
        values.overtime_amount,
        values.calculated_amount,
        values.advance,
        values.previous_advance,
        values.total_advance,
        values.remaining_balance,
        normalizeStatus(status),
        String(notes || "").trim() || null,
      ]
    );

    const created = await getSalaryById(
      result.insertId
    );

    res.status(201).json(created);
  } catch (error) {
    console.error(
      "POST employee salary error:",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "This employee already has a salary record for this month.",
      });
    }

    res.status(500).json({
      message:
        "Employee salary record could not be created.",
      error: error.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const salaryId = req.params.id;
    const {
      employee_id,
      salary_month,
      status,
      notes,
    } = req.body;

    const existing = await getSalaryById(
      salaryId
    );

    if (!existing) {
      return res.status(404).json({
        message: "Salary record not found.",
      });
    }

    if (
      !employee_id ||
      !validateMonth(salary_month)
    ) {
      return res.status(400).json({
        message:
          "employee_id and salary_month (YYYY-MM) are required.",
      });
    }

    const employees = await query(
      `SELECT id, basic_salary
       FROM employees
       WHERE id = ?
       LIMIT 1`,
      [employee_id]
    );

    if (!employees.length) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    const registeredSalary = toNumber(
      employees[0].basic_salary
    );

    const basicSalary =
      toNumber(req.body.basic_salary) > 0
        ? toNumber(req.body.basic_salary)
        : registeredSalary;

    if (basicSalary <= 0) {
      return res.status(400).json({
        message:
          "Basic salary must be greater than zero.",
      });
    }

    const values = calculateSalary({
      ...req.body,
      basic_salary: basicSalary,
    });

    await query(
      `UPDATE employee_rates
       SET
        employee_id = ?,
        salary_month = ?,
        basic_salary = ?,
        per_day_salary = ?,
        extra_days = ?,
        extra_day_amount = ?,
        absent_days = ?,
        absent_amount = ?,
        time_deduction_hours = ?,
        time_deduction_rate = ?,
        time_deduction_amount = ?,
        overtime_hours = ?,
        overtime_rate = ?,
        overtime_amount = ?,
        calculated_amount = ?,
        advance = ?,
        previous_advance = ?,
        total_advance = ?,
        remaining_balance = ?,
        status = ?,
        notes = ?
       WHERE id = ?`,
      [
        employee_id,
        salary_month,
        values.basic_salary,
        values.per_day_salary,
        values.extra_days,
        values.extra_day_amount,
        values.absent_days,
        values.absent_amount,
        values.time_deduction_hours,
        values.time_deduction_rate,
        values.time_deduction_amount,
        values.overtime_hours,
        values.overtime_rate,
        values.overtime_amount,
        values.calculated_amount,
        values.advance,
        values.previous_advance,
        values.total_advance,
        values.remaining_balance,
        normalizeStatus(status),
        String(notes || "").trim() || null,
        salaryId,
      ]
    );

    const updated = await getSalaryById(
      salaryId
    );

    res.json(updated);
  } catch (error) {
    console.error(
      "PUT employee salary error:",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "This employee already has a salary record for this month.",
      });
    }

    res.status(500).json({
      message:
        "Employee salary record could not be updated.",
      error: error.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM employee_rates
       WHERE id = ?`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Salary record not found.",
      });
    }

    res.json({
      message:
        "Employee salary record deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE employee salary error:",
      error
    );

    res.status(500).json({
      message:
        "Employee salary record could not be deleted.",
      error: error.message,
    });
  }
});

module.exports = router;
