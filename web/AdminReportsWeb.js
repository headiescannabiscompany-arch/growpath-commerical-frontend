import React, { useEffect, useState } from "react";
import { Table, Button, Tag, Spin, message } from "antd";
import { getReports, resolveReport } from "../src/api/adminReports";

export default function AdminReportsWeb() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await getReports(window.globalToken);
      setReports(res.data);
    } catch (err) {
      message.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line
  }, []);

  async function handleResolve(id) {
    setResolving(id);
    try {
      await resolveReport(id, window.globalToken);
      setReports(reports.map((r) => (r._id === id ? { ...r, status: "resolved" } : r)));
      message.success("Report resolved");
    } catch (err) {
      message.error("Failed to resolve report");
    } finally {
      setResolving(null);
    }
  }

  const columns = [
    { title: "Type", dataIndex: "contentType", key: "contentType" },
    { title: "Reason", dataIndex: "reason", key: "reason" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <Tag color={status === "open" ? "red" : "green"}>{status}</Tag>
    },
    {
      title: "Reported By",
      dataIndex: ["reportedBy", "username"],
      key: "reportedBy",
      render: (text, record) => text || record.reportedBy?._id
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => new Date(d).toLocaleString()
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) =>
        record.status === "open" ? (
          <Button
            type="primary"
            loading={resolving === record._id}
            onClick={() => handleResolve(record._id)}
          >
            Resolve
          </Button>
        ) : null
    }
  ];

  return (
    <div style={{ padding: 32 }}>
      <h2>User Reports (Admin)</h2>
      <Spin spinning={loading}>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={reports}
          pagination={{ pageSize: 10 }}
        />
      </Spin>
    </div>
  );
}
