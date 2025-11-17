import { alertStyleEnum } from "@ksi-core/backend/db";
import { t } from "elysia";

export const AlertBodyType = {
    body: t.Object({
        title: t.String(),
        description: t.String(),
        color: t.Enum(Object.fromEntries(alertStyleEnum.enumValues.map(e => ([e, e])))),
        startDate: t.Date(),
        endDate: t.Date(),
        priority: t.Optional(t.Integer()),
        link: t.Optional(t.String())
    })
}