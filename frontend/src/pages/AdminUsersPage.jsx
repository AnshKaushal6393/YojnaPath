import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { downloadAdminUsersExport, fetchAdminUsers } from "../lib/adminApi";
import { formatDateTime, formatNumber, getUserDisplayPhoto } from "../lib/adminUi";
import { USER_TYPE_OPTIONS } from "../data/profileOptions";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

function getUserTypeLabel(userType) {
  if (!userType) return "Unknown";

  const normalized = userType.toString().toLowerCase().trim();
  const legacyMap = {
    shopkeeper: "business",
    artisan: "business",
    daily_wage: "worker",
    retired: "senior",
    disabled: "disability",
    migrant_worker: "worker",
  };
  const mapped = legacyMap[normalized] || normalized;
  const match = USER_TYPE_OPTIONS.find((option) => option.key === mapped);

  return match?.label || mapped.charAt(0).toUpperCase() + mapped.slice(1) || "Unknown";
}

function createEmptyFilters() {
  return {
    page: 1,
    limit: 10,
    state: "",
    userType: "",
    search: "",
    hasPhoto: "",
    sortBy: "createdAt",
    sortDir: "desc",
  };
}

function SortPill({ active, direction }) {
  if (!active) {
    return (
      <Badge variant="default" className="px-2 py-0.5 text-[10px] tracking-[0.14em]">
        SORT
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="px-2 py-0.5 text-[10px] tracking-[0.14em]">
      {direction === "asc" ? "ASC" : "DESC"}
    </Badge>
  );
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(createEmptyFilters);
  const [isExporting, setIsExporting] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () => fetchAdminUsers(filters),
  });

  useEffect(() => {
    if (usersQuery.isSuccess && usersQuery.data === null) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate, usersQuery.data, usersQuery.isSuccess]);

  function handleFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  }

  function handleSortChange(sortBy) {
    setFilters((current) => ({
      ...current,
      sortBy,
      sortDir: current.sortBy === sortBy && current.sortDir === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  async function handleExport() {
    setIsExporting(true);

    try {
      const blob = await downloadAdminUsersExport();
      if (!blob) {
        navigate("/admin/login", { replace: true });
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "admin-users-export.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  const usersPayload = usersQuery.data;
  const users = usersPayload?.users || [];
  const totalPages = usersPayload?.totalPages || 0;

  const columns = useMemo(
    () => [
      {
        id: "photo",
        header: "Photo",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          const thumbnail = getUserDisplayPhoto(user);

          return (
            <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
              {thumbnail ? (
                <img src={thumbnail} alt={user.name || "User photo"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500">
                  No photo
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div>
              <span className="block text-sm font-semibold text-white">{user.name || "Unknown"}</span>
              <span className="mt-1 block text-xs text-slate-400">{user.phone}</span>
              {user.primaryProfile?.profileName ? (
                <span className="mt-1 block text-xs text-slate-500">
                  Profile: {user.primaryProfile.profileName}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "state",
        header: "State / Type",
        accessorFn: (row) => row.primaryProfile?.state || "NA",
        cell: ({ row }) => {
          const user = row.original;
          const userType = getUserTypeLabel(user.primaryProfile?.userType || user.primaryProfile?.occupation);

          return (
            <div className="text-sm text-slate-300">
              <span className="block">{user.primaryProfile?.state || "NA"}</span>
              <span className="mt-1 block">{userType}</span>
              <Badge variant="default" className="mt-2 px-2.5 py-1 text-[11px] text-slate-400">
                {user.onboardingDone ? "Onboarding complete" : "Onboarding pending"}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "matchRuns",
        header: "Match stats",
        accessorFn: (row) => row.stats?.matchRuns || 0,
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex flex-wrap gap-2 text-sm text-slate-300">
              <Badge variant="default">{formatNumber(user.stats?.matchRuns)} runs</Badge>
              <Badge variant="default">{formatNumber(user.stats?.totalMatches)} schemes</Badge>
              <Badge variant="default">{formatNumber(user.stats?.totalNearMisses)} near misses</Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "lastLogin",
        header: "Last login",
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="text-sm text-slate-300">
              <span className="block">{formatDateTime(user.lastLogin)}</span>
              <span className="mt-2 block text-xs text-slate-500">
                {user.registrationCompletedAt ? "Registered" : "Registration pending"}
              </span>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages || 0,
    state: {
      sorting: [
        {
          id: filters.sortBy,
          desc: filters.sortDir === "desc",
        },
      ],
    },
  });

  return (
    <Card className="p-0">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">User Routes</p>
          <CardTitle className="mt-3 text-2xl">Admin user explorer</CardTitle>
          <CardDescription>Search, filter, export, and open full user detail pages.</CardDescription>
        </div>
        <Button type="button" variant="secondary" onClick={handleExport} disabled={isExporting} className="w-fit">
          {isExporting ? "Exporting..." : "Export users CSV"}
        </Button>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input
            type="search"
            id="admin-users-search"
            name="search"
            value={filters.search}
            onChange={(event) => handleFilterChange("search", event.target.value)}
            placeholder="Search by name, phone, or profile name"
          />
          <Input
            type="text"
            id="admin-users-state"
            name="state"
            value={filters.state}
            onChange={(event) => handleFilterChange("state", event.target.value.toUpperCase())}
            placeholder="Filter by state"
            maxLength={10}
          />
          <Select
            id="admin-users-type"
            name="userType"
            value={filters.userType}
            onChange={(event) => handleFilterChange("userType", event.target.value)}
          >
            <option value="">All user types</option>
            <option value="farmer">farmer</option>
            <option value="business">business</option>
            <option value="women">women</option>
            <option value="student">student</option>
            <option value="worker">worker</option>
            <option value="health">health</option>
            <option value="housing">housing</option>
            <option value="senior">senior</option>
            <option value="disability">disability</option>
            <option value="shopkeeper">shopkeeper</option>
            <option value="artisan">artisan</option>
            <option value="daily_wage">daily_wage</option>
            <option value="retired">retired</option>
            <option value="disabled">disabled</option>
            <option value="migrant_worker">migrant_worker</option>
          </Select>
          <Select
            id="admin-users-photo"
            name="hasPhoto"
            value={filters.hasPhoto}
            onChange={(event) => handleFilterChange("hasPhoto", event.target.value)}
          >
            <option value="">All photos</option>
            <option value="true">Has photo</option>
            <option value="false">No photo</option>
          </Select>
          <Button type="button" variant="outline" onClick={() => setFilters(createEmptyFilters())}>
            Reset filters
          </Button>
        </div>

        {usersQuery.error ? (
          <div className="mt-6 rounded-[20px] border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
            {usersQuery.error.message || "Could not load users right now."}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
          <div className="overflow-x-auto">
            <Table className="min-w-[1080px] bg-slate-950/60">
              <TableHeader className="bg-white/10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-white/10 hover:bg-transparent">
                    {headerGroup.headers.map((header) => {
                      const sortBy = header.column.id;
                      const isSorted = filters.sortBy === sortBy;
                      const direction = filters.sortDir;

                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : header.column.getCanSort() === false ? (
                            header.column.columnDef.header
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSortChange(sortBy)}
                              className="inline-flex items-center gap-2 transition hover:text-white"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <SortPill active={isSorted} direction={direction} />
                            </button>
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {usersQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="px-4 py-6 text-sm text-slate-400">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!usersQuery.isLoading && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="px-4 py-6 text-sm text-slate-400">
                      No users match the current filters.
                    </TableCell>
                  </TableRow>
                ) : null}
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/users/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Showing {formatNumber(usersPayload?.total || 0)} users. Page {formatNumber(filters.page)} of{" "}
            {formatNumber(totalPages || 1)}
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleFilterChange("page", Math.max(filters.page - 1, 1))}
              disabled={filters.page <= 1}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleFilterChange("page", totalPages ? Math.min(filters.page + 1, totalPages) : filters.page + 1)
              }
              disabled={Boolean(totalPages) && filters.page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
