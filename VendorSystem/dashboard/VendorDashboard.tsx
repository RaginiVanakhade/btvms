import { Box, Typography } from '@mui/material'
import { AiTwotoneFileText } from "react-icons/ai";
import { AiTwotoneExclamationCircle } from "react-icons/ai";
import { AiTwotoneDollarCircle } from "react-icons/ai";
import { AiTwotoneCreditCard } from "react-icons/ai";
import { useQuery } from '@tanstack/react-query';
import VendorSerivceInstance from 'service/wms/service.vendor';
import useAuth from 'hooks/useAuth';
import {
    PieChart,
    Pie,
    Cell,
    Legend,
    ResponsiveContainer
} from "recharts";

const VendorDashboard = () => {
    const { user } = useAuth();

    // total invoice count api
    const sql_InvoiceCount =
        `Select count(*) from VW_TR_AC_LPO_HEADER
         WHERE LAST_ACTION <> 'SAVEASDRAFT' 
         AND COMPANY_CODE = 'BSG'
         AND AC_CODE = ${user?.loginid}`

    const { data: totalInvoice } = useQuery({
        queryKey: ['totalInvoice', sql_InvoiceCount],
        queryFn: async () => {
            return await VendorSerivceInstance.executeRawSql(sql_InvoiceCount);
        }
    });
    console.log(totalInvoice, "total Invoice")



    // total invoice count api
    const sql_PendingApproval =
        `Select count(*) from VW_TR_AC_LPO_HEADER
         WHERE LAST_ACTION <> 'SAVEASDRAFT' 
         AND COMPANY_CODE = 'BSG'
         AND AC_CODE = ${user?.loginid}`

    const { data: totalPendingApproval } = useQuery({
        queryKey: ['totalPendingInvoice', sql_PendingApproval],
        queryFn: async () => {
            return await VendorSerivceInstance.executeRawSql(sql_PendingApproval);
        }
    });
    console.log(totalPendingApproval, "total pending approval")

    // total invoice count api
    const sql_Overview =
        `select 'Submitted' AS LAST_ACTION,count(*)
         AS NO_OF_RECORDS from VW_TR_AC_LPO_HEADER 
         where  AC_CODE = ${user?.loginid} AND COMPANY_CODE = 'BSG' 
         and LAST_ACTION = 'SUBMITTED'
        UNION
        SELECT 'Paid' AS PAID,COUNT(*)
        AS NO_OF_RECORDS FROM VW_LPO_HEADER_DOCNO_PAID_AWARE 
        where  AC_CODE = loginid AND COMPANY_CODE = 'BSG'
        UNION
        SELECT 'Approved' AS APPROVED , COUNT(*) AS NO_OF_RECORDS from VW_TR_AC_LPO_HEADER 
        where  AC_CODE = ${user?.loginid} AND COMPANY_CODE = 'BSG' and FINAL_APPROVED = 'YES'`

    const { data: overview } = useQuery({
        queryKey: ['Overview', sql_Overview],
        queryFn: async () => {
            return await VendorSerivceInstance.executeRawSql(sql_Overview);
        }
    });
    console.log(overview, "overview")



    // ✅ Extract counts safely (API returns array like [{ "COUNT(*)": 1 }])
    const totalInvoiceCount = totalInvoice?.[0]?.["COUNT(*)"] ?? 0;
    const totalPendingApprovalCount = totalPendingApproval?.[0]?.["COUNT(*)"] ?? 0;

    const statusDetails = [
        {
            status: "Total invoices Reised",
            statusScore: totalInvoiceCount,
            icon: <AiTwotoneFileText />,
        },
        {
            status: "Pending Approval",
            statusScore: totalPendingApprovalCount,
            icon: <AiTwotoneExclamationCircle />,
        },
        {
            status: "Outstanding Amount",
            statusScore: "",
            icon: <AiTwotoneDollarCircle />,
        },
        {
            status: "Last Payment Received",
            statusScore: "",
            icon: <AiTwotoneCreditCard />,
        }
    ]

    return <Box sx={{ height: "100vh" }}>
        <Typography variant="h3">
            Dashboard
        </Typography>

        {/* Status Details Cards */}
        <Box sx={{ display: "flex", gap: 4 }}>
            {statusDetails.map((item, index) => (
                <Box
                    key={index}
                    sx={{
                        border: "1px solid #ccc",
                        borderRadius: 2,
                        p: 2,
                        minWidth: 200,
                        textAlign: "center",
                        boxShadow: 1,
                    }}
                >
                    <Typography variant="h5" color="">{item.icon}</Typography>
                    <Typography variant="h6">{item.status}</Typography>
                    <Typography variant="h3" color="">{item.statusScore}</Typography>
                </Box>
            ))}
        </Box>

        <Box>
            <Box>
                    <div style={{ width: "100%", height: 250 }}>
      <h4>Invoice Status Overview</h4>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            // data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
          </Pie>
          <Legend verticalAlign="middle" align="right" />
        </PieChart>
      </ResponsiveContainer>
    </div>
            </Box>
        </Box>

    </Box>
}


export default VendorDashboard