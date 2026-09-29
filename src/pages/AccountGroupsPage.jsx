import React from "react";
import SalesCrudPage from "../components/SalesCrudPage";

const AccountGroupsPage = () => (
  <SalesCrudPage
    title="Chart of Account Groups"
    endpoint="account-groups"
    requiredField="group_name"
    searchFields={["group_name", "parent_group", "type"]}
    fields={[
      { name: "group_name", label: "Group Name" },
      { name: "parent_group", label: "Parent Group" },
      { name: "type", label: "Type" },
    ]}
  />
);

export default AccountGroupsPage;
