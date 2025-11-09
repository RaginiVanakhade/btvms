import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import VendorCustomGrid from 'components/grid/VednorCustomGrid';
import { ColDef, CellValueChangedEvent } from 'ag-grid-community';
import { showAlert } from 'store/CustomAlert/alertSlice';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';

// import ActionButtonsGroup from 'components/buttons/ActionButtonsGroup';
// import { TAvailableActionButtons } from 'types/types.actionButtonsGroups';

interface VendorItemDetailsProps {
  vendorDetails: any[];
  onRowsChange?: (rows: any[]) => void;
  disabled?: boolean;
  hideReset?: boolean;
  setUpdatedRows?: React.Dispatch<React.SetStateAction<any[]>>;
  //  setRowData: React.Dispatch<React.SetStateAction<detailsTVendor[]>>; 
  updatedRows?: any[];
}


const VendorItemDeletRemove: React.FC<VendorItemDetailsProps> = ({
  vendorDetails = [],
  onRowsChange,
  disabled = false,
  hideReset = false,// default false
  //  setRowData,
  // rowData,
  setUpdatedRows,
  updatedRows,

}) => {
  const dispatch = useDispatch();
    const intl = useIntl();
  const isInitialized = useRef(false);
  // initialize rows by cloning and ensuring numeric QTY and ORIGINAL_QTY
  const initializeRows = useCallback((data: any[]) => {
    return (data || []).map((r) => {
      const qty = r?.QTY !== undefined && r?.QTY !== null ? Number(r.QTY) : 0;
      const original = r?.ORIGINAL_QTY !== undefined && r?.ORIGINAL_QTY !== null ? Number(r.ORIGINAL_QTY) : qty;
      return {
        ...r,
        QTY: qty,
        ORIGINAL_QTY: original
      };
    });
  }, []);

  const [rowData, setRowData] = useState<any[]>(() => initializeRows(updatedRows || vendorDetails || []));
  console.log("rowDatarowData", rowData, updatedRows)
  const [pinnedBottomRowData, setPinnedBottomRowData] = useState<any[]>([]);

  // Re-init rowData whenever vendorDetails content changes (handles re-opening form)
  useEffect(() => {
    if (!isInitialized.current) {
      setRowData(initializeRows(updatedRows || vendorDetails || []));
      isInitialized.current = true;
    }
  }, [vendorDetails, updatedRows, initializeRows]);



  // stable amount formatter
  const amountFormatter = useCallback((params: any) => {
    if (params.value === null || params.value === undefined || params.value === '') return '';
    const num = Number(params.value);
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(Math.abs(num));
    return num < 0 ? `(-${formatted})` : formatted;
  }, []);

  // action handler
  const handleActions = useCallback(
    (action: string, data: any) => {
      if (action === 'delete') {
        setRowData((prev) => {
          const updated = prev.filter((row) => row.SERIAL_NO !== data.SERIAL_NO);
          setUpdatedRows?.(updated);
          dispatch(
            showAlert({
              open: true,
              message: 'Item deleted successfully.',
              severity: 'success'
            })
          );
          return updated;
        });
      }
    },
    [dispatch, setUpdatedRows]
  );

  // memoized column definitions
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'SERIAL_NO',
        headerName: 'Sr No',
        width: 85,
        editable: false,
        cellStyle: () => ({ color: 'grey', fontSize: '0.775rem' })
      },
      {
        field: 'REMARKS',
        headerName: 'Description',
        width: 400,
        editable: false,
        wrapText: true,
        cellStyle: (params) => {
          if (params.value === 'Total') {
            return { fontWeight: 'bold', color: 'black', fontSize: '0.775rem' };
          }
          return { color: 'grey', fontWeight: 'normal', fontSize: '0.775rem' };
        }
      },
      {
        field: 'QTY',
        headerName: 'Qty',
        width: 80,
        editable: !disabled,
        cellStyle: (params) => {
          return {
            fontSize: '0.775rem',
            color: disabled ? 'grey' : '', // text color grey if disabled
          };
        },
        valueSetter: (params) => {
          if (disabled) return false;

          const originalQty = Number(params.data.ORIGINAL_QTY ?? params.data.QTY ?? 0);
          const raw = params.newValue;

          if (raw === '' || raw === null || raw === undefined) {
            return false;
          }
          const newValue = Math.floor(Number(raw));
          if (isNaN(newValue)) {
            return false;
          }

          const pdoType = params.data?.PDO_TYPE;

          if (pdoType === 'P' || pdoType === 'Q') {
            // Allow any qty (including increase)
            params.data.QTY = newValue;
            return true;
          }
          if (newValue <= originalQty) {
            // Allow only decrease or same for other PDO_TYPEs
            params.data.QTY = newValue;
            return true;
          }

          dispatch(
            showAlert({
              open: true,
              message: `You cannot increase quantity beyond original value (${originalQty}) for PDO Type '${pdoType}'.`,
              severity: 'warning'
            })
          );
          return false;
        },



        cellEditor: 'agTextCellEditor',
        valueFormatter: (params) =>
          params.value !== null && params.value !== undefined && params.value !== '' ? Math.floor(Number(params.value)).toString() : ''
      },
       {
        field: 'ORIGINAL_QTY',
        headerName: intl.formatMessage({ id: 'Org Qty' }) || 'Org Qty',
        width: 100,
        editable: false,
        cellStyle: () => ({ color: 'grey', textAlign: 'right', fontSize: '0.775rem' }),
        valueFormatter: amountFormatter
      },
      {
        field: 'PRICE',
        headerName: 'Rate',
        width: 100,
        editable: false,
        cellStyle: () => ({ color: 'grey', textAlign: 'right', fontSize: '0.775rem' }),
        valueFormatter: amountFormatter
        // valueGetter: (params) => {
        //   if (params.data.amount !== undefined) return params.data.amount;
        //   const qty = Number(params.data.QTY) || 0;
        //   const price = Number(params.data.PRICE) || 0;
        //   return qty * price;
        // }
      },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 110,
        editable: false,
        valueGetter: (params) => {
          if (params.node?.rowPinned) return params.data.amount;
          const qty = Number(params.data.QTY) || 0;
          const price = Number(params.data.PRICE) || 0;
          return qty * price;
        },
        cellStyle: () => ({ color: 'grey', textAlign: 'right', fontSize: '0.775rem' }),
        valueFormatter: amountFormatter
      },
      {
        field: 'CURR_CODE',
        headerName: 'Currency',
        width: 105,
        editable: false,
        cellStyle: { color: 'grey' }
      },
      {
        field: 'EX_RATE',
        headerName: 'Ex Rate',
        width: 95,
        editable: false,
        cellStyle: () => ({ color: 'grey', textAlign: 'right', fontSize: '0.775rem' }),
        valueFormatter: amountFormatter
      },
      {
        headerName: 'Base Amt',
        field: 'baseAmt',
        width: 110,
        editable: false,
        valueGetter: (params) => {
          if (params.node?.rowPinned) return params.data.baseAmt;
          const qty = Number(params.data.QTY) || 0;
          const price = Number(params.data.PRICE) || 0;
          const exRate = Number(params.data.EX_RATE) || 1;
          return qty * price * exRate;
        },
        cellStyle: () => ({ color: 'grey', textAlign: 'right', fontSize: '0.775rem' }),
        valueFormatter: amountFormatter
      },
      {
        field: 'TX_CAT_CODE',
        headerName: 'Tax Code',
        width: 110,
        editable: false,
        cellStyle: { color: 'grey' }
      },
      {
        field: 'TX_COMPNT_PERC_1',
        headerName: 'Tax %',
        width: 85,
        editable: false,
        cellStyle: () => ({ color: 'grey', textAlign: 'right', fontSize: '0.775rem' })
      },
      {
        headerName: 'Tax Local Amt',
        field: 'taxLocalAmt',
        width: 135,
        editable: false,
        valueGetter: (params) => {
          if (params.node?.rowPinned) return params.data.taxLocalAmt;
          const qty = Number(params.data.QTY) || 0;
          const price = Number(params.data.PRICE) || 0;
          const exRate = Number(params.data.EX_RATE) || 1;
          const taxPerc = (Number(params.data.TX_COMPNT_PERC_1) || 0) / 100;
          return qty * price * exRate * taxPerc;
        },
        cellStyle: () => ({ color: 'grey', textAlign: 'right', fontSize: '0.775rem' }),
        valueFormatter: amountFormatter
      },
      {
        headerName: 'Tax Com Amt 1',
        field: 'taxComAmt1',
        width: 140,
        editable: false,
        valueGetter: (params) => {
          if (params.node?.rowPinned) return params.data.taxComAmt1;
          const qty = Number(params.data.QTY) || 0;
          const price = Number(params.data.PRICE) || 0;
          const taxPerc = (Number(params.data.TX_COMPNT_PERC_1) || 0) / 100;
          return qty * price * taxPerc;
        },
        cellStyle: () => ({ color: 'grey', textAlign: 'right', fontSize: '0.775rem' }),
        valueFormatter: amountFormatter
      },
      {
        headerName: 'Final Amt',
        field: 'finalAmt',
        width: 120,
        editable: false,
        valueGetter: (params) => {
          if (params.node?.rowPinned) return params.data.finalAmt;
          const qty = Number(params.data.QTY) || 0;
          const price = Number(params.data.PRICE) || 0;
          const exRate = Number(params.data.EX_RATE) || 1;
          const taxPerc = (Number(params.data.TX_COMPNT_PERC_1) || 0) / 100;
          const baseAmt = qty * price * exRate;
          return baseAmt + baseAmt * taxPerc;
        },
        cellStyle: () => ({ color: 'grey', textAlign: 'right', fontSize: '0.775rem' }),
        valueFormatter: amountFormatter
      },
      //   {
      //     headerName: 'Action',
      //     field: 'action',
      //     width: 130,
      //     cellRenderer: (params: { data: any }) => {
      //       const data = params.data;
      //       if (data?.REMARKS === 'Total') return null;
      //       const actionButtons: TAvailableActionButtons[] = ['delete'];
      //       return <ActionButtonsGroup handleActions={(action) => handleActions(action, data)} buttons={actionButtons} />;
      //     }
      //   }
    ],
    [handleActions, amountFormatter]
  );

  // totals calc
  const recalcTotals = useCallback((data: any[]) => {
    const totalQty = data.reduce((sum, row) => sum + (Number(row.QTY) || 0), 0);
    const totalAmount = data.reduce((sum, row) => sum + (Number(row.QTY) || 0) * (Number(row.PRICE) || 0), 0);
    const totalBaseAmt = data.reduce((sum, row) => sum + (Number(row.QTY) || 0) * (Number(row.PRICE) || 0) * (Number(row.EX_RATE) || 1), 0);
    const totalTaxLocalAmt = data.reduce((sum, row) => {
      const qty = Number(row.QTY) || 0;
      const price = Number(row.PRICE) || 0;
      const exRate = Number(row.EX_RATE) || 1;
      const taxPerc = (Number(row.TX_COMPNT_PERC_1) || 0) / 100;
      return sum + qty * price * exRate * taxPerc;
    }, 0);
    const totalTaxComAmt1 = data.reduce((sum, row) => {
      const qty = Number(row.QTY) || 0;
      const price = Number(row.PRICE) || 0;
      const taxPerc = (Number(row.TX_COMPNT_PERC_1) || 0) / 100;
      return sum + qty * price * taxPerc;
    }, 0);
    const totalFinalAmt = data.reduce((sum, row) => {
      const qty = Number(row.QTY) || 0;
      const price = Number(row.PRICE) || 0;
      const exRate = Number(row.EX_RATE) || 1;
      const taxPerc = (Number(row.TX_COMPNT_PERC_1) || 0) / 100;
      const baseAmt = qty * price * exRate;
      return sum + (baseAmt + baseAmt * taxPerc);
    }, 0);

    setPinnedBottomRowData([
      {
        REMARKS: 'Total',
        QTY: totalQty,
        amount: Number(totalAmount.toFixed(3)),
        baseAmt: Number(totalBaseAmt.toFixed(3)),
        taxLocalAmt: Number(totalTaxLocalAmt.toFixed(3)),
        taxComAmt1: Number(totalTaxComAmt1.toFixed(3)),
        finalAmt: Number(totalFinalAmt.toFixed(3))
      }
    ]);
  }, []);

  // when rowData changes, recalc totals and notify parent
  // useEffect(() => {
  //   recalcTotals(rowData || []);
  //   // Send only rows with QTY > 0 to parent
  //   const rowsToSend = (rowData || []).filter((row) => Number(row.QTY) > 0);
  //   onRowsChange?.(rowsToSend);
  // }, [rowData, recalcTotals, onRowsChange]);

  useEffect(() => {
    recalcTotals(rowData || []);
    // onRowsChange?.(rowData || []);
    // setUpdatedRows?.(rowData || []);
    // const rowsToSend = (rowData || []).filter((row) => Number(row.QTY) > 0);

    onRowsChange?.(rowData);
    setUpdatedRows?.(rowData)

  }, [rowData, recalcTotals, onRowsChange, setUpdatedRows]);

  // cell edit handler
  const handleCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    const updatedRow = event.data;
    // setRowData((prev) =>
    //   prev.map((r) =>
    //     r.SERIAL_NO === updatedRow.SERIAL_NO
    //       ? {
    //         ...r,
    //         ...updatedRow,
    //         QTY: updatedRow.QTY !== undefined && updatedRow.QTY !== null ? Number(updatedRow.QTY) : Number(r.QTY || 0)
    //       }
    //       : r
    //   )
    // );


    const newRowData = (rowData || []).map((r) =>
      r.SERIAL_NO === updatedRow.SERIAL_NO
        ? {
          ...r,
          ...updatedRow,
          QTY: updatedRow.QTY !== undefined && updatedRow.QTY !== null ? Number(updatedRow.QTY) : Number(r.QTY || 0)
        }
        : r
    );
    const newRowData1 = (rowData || []).map((r) =>
      r.SERIAL_NO === updatedRow.SERIAL_NO
        ? {
          ...r,
          ...updatedRow,
          QTY: updatedRow.QTY !== undefined && updatedRow.QTY !== null ? Number(updatedRow.QTY) : Number(r.QTY || 0)
        }
        : r
    );

    setRowData(newRowData);
    // const rowsToSend = newRowData.filter((row) => Number(row.QTY) > 0);
    setUpdatedRows?.(newRowData1);

  }, [rowData, setUpdatedRows]);

  //   const handleReset = () => {
  //     // Set all QTY to 0
  //     setRowData((prev) =>
  //       prev.map((row) => ({
  //         ...row,
  //         QTY: 0
  //       }))
  //     );
  //   };

  return (
    <Box sx={{ height: 380, width: 'auto' }}>
      {/* {!hideReset && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginRight: '18px' }}>
          <Button
            onClick={handleReset}
            // disabled={disabled}
            sx={{
              fontSize: '0.895rem',
              backgroundColor: '#fff',
              color: '#082A89',
              border: '1.5px solid #082A89',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#082A89',
                color: '#fff',
                border: '1.5px solid #082A89'
              }
            }}
          >
            Reset
          </Button>
        </div>
      )} */}

      <div className="ag-theme-alpine" style={{ height: '100%', width: '100%', overflowX: 'auto' }}>
        <VendorCustomGrid
          columnDefs={columnDefs}
          defaultColDef={{
            filter: true,
            sortable: true,
            resizable: true,
            headerClass: 'ag-center-header',
            cellStyle: { whiteSpace: 'normal', wordWrap: 'break-word', fontSize: '0.775rem' }
          }}
          rowData={rowData}
          pinnedBottomRowData={pinnedBottomRowData}
          //  getRowId={(params) => `${params.data.SERIAL_NO}-${params.data.REMARKS}`}
          rowHeight={20}
          height="380px"
          headerHeight={30}
          paginationPageSizeSelector={[10, 50, 100, 500, 2000]}
          paginationPageSize={10}
          onCellValueChanged={handleCellValueChanged}

        />
      </div>
    </Box>
  );
};

export default VendorItemDeletRemove;
