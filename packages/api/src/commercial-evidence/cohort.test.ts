import { describe,expect,it } from "vitest";
import { buildAsOfCases } from "./cohort";
describe("as-of commercial cohort",()=>{
 it("orders equal-time attribution before feedback and excludes future facts/outcomes",()=>{const time=new Date("2026-01-01");const [result]=buildAsOfCases({asOf:time,leads:[{id:"lead",createdAt:new Date("2025-01-01")}],financial:[],activities:[
  {id:"z-feedback",leadId:"lead",kind:"caller_feedback",occurredAt:time,description:null,metadata:{questions:[{questionKey:"primaryProfile",answer:"parado_desempleado"}]}},
  {id:"a-created",leadId:"lead",kind:"lead_created",occurredAt:time,description:null,metadata:{source:"Meta"}},
  {id:"future",leadId:"lead",kind:"closer_feedback",occurredAt:new Date("2026-01-02"),description:"Venta",metadata:{}},
 ]});expect(result?.acquisition.source).toBe("Meta");expect(result?.facts.primaryProfile).toEqual({kind:"value",value:"parado_desempleado"});expect(result?.sold).toBe(false);});
 it("uses the latest assignment epoch at asOf",()=>{const [result]=buildAsOfCases({asOf:new Date("2026-02-01"),leads:[{id:"lead",createdAt:new Date("2025-01-01")}],financial:[],activities:[{id:"a",leadId:"lead",kind:"caller_assigned",occurredAt:new Date("2026-01-01"),description:null,metadata:{}},{id:"b",leadId:"lead",kind:"caller_assigned",occurredAt:new Date("2026-01-15"),description:null,metadata:{}}]});expect(result?.assignmentAt).toEqual(new Date("2026-01-15"));});
});
