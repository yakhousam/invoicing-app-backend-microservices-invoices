import { ddbDocClient, tableName } from "@/db/client";
import { addStatusToInvoice, getUserId } from "@/utils";
import { getAllInvoicesResponse, Invoice } from "@/validation";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const getAllInvoicesController = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const userId = getUserId(event);

  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
  const invoices: Invoice[] = [];

  do {
    const command: QueryCommand = new QueryCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      ProjectionExpression:
        "invoiceId, invoiceDate, totalAmount, paid, invoiceDueDays, currency, clientName",
    });
    const data = await ddbDocClient.send(command);
    const items = data.Items as Omit<Invoice, "status">[];
    if (items) {
      const filteredItems: Invoice[] = items
        .filter((item) => !item.invoiceId.startsWith("counter"))
        .map(addStatusToInvoice);

      invoices.push(...filteredItems);
    }
    lastEvaluatedKey = data.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  const parsedInvoices = getAllInvoicesResponse.parse(invoices);

  const response = {
    invoices: parsedInvoices,
    count: invoices.length,
  };
  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};

export default getAllInvoicesController;
