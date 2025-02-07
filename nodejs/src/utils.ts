import dayjs from "dayjs";
import { type Invoice } from "./validation";
import { type APIGatewayProxyEvent } from "aws-lambda";

const isDev = process.env.NODE_ENV === "development";

export function getUserId(event: APIGatewayProxyEvent): string {
  return isDev
    ? process.env.userId
    : event.requestContext.authorizer?.jwt?.claims?.sub;
}

export function createUpdateExpression(
  updates: Record<string, unknown>
): string {
  return (
    "SET " +
    Object.keys(updates)
      .map((key) => `${key} = :${key}`)
      .join(", ")
  );
}

export function createExpressionAttributeValues(
  updates: Record<string, unknown>
) {
  return Object.entries(updates).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (typeof value === "object" && value !== null) {
        acc[`:${key}`] = JSON.stringify(value);
      } else {
        acc[`:${key}`] = value;
      }
      return acc;
    },
    {}
  );
}

export function addStatusToInvoice(invoice: Omit<Invoice, "status">): Invoice {
  let status: Invoice["status"] = "sent";
  if (invoice.paid) {
    status = "paid";
  } else {
    status = dayjs().isAfter(
      dayjs(invoice.invoiceDate).add(invoice.invoiceDueDays, "day")
    )
      ? "overdue"
      : "sent";
  }
  return {
    ...invoice,
    status,
  };
}
