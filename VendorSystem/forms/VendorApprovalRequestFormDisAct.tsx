import React, { useEffect, useState } from 'react';
import { Box, Paper, Tabs, Tab, Grid, ButtonGroup, Button, TextField, Autocomplete, Tooltip } from '@mui/material';
import { FaCheckCircle } from 'react-icons/fa';
import CustomAlert from 'components/@extended/CustomAlert';
import { detailsTVendor, TVendorMain } from '../vendorTypes/TVendor';
import VendorItemDeletRemove from './VendorItemDeletRemove';
import useAuth from 'hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import VendorRequestService, { IRefDocNo } from '../services/VendorRequestService';
import { showAlert } from 'store/CustomAlert/alertSlice';
import VendorSerivceInstance from '../services/service.vendor';
import { IoIosAttach } from 'react-icons/io';
import { ImExit } from 'react-icons/im';
import { TUniversalDialogProps } from 'types/types.UniversalDialog';
import UniversalDialog from 'components/popup/UniversalDialog';
import VendorFilesDialog from '../components/VendorFilesDialog';
import { openBackdrop, closeBackdrop } from 'store/reducers/backdropSlice';
import { useDispatch } from 'react-redux';
import { RiArrowGoBackFill } from 'react-icons/ri';
import VendorSendBack from 'pages/VendorSystem/VendorSendBack';
// import VendorSendBack from 'pages/VendorSystem/VendorSendBack';
import { MdCancelScheduleSend } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { convertToInputFormat } from 'utils/dateFormatter';

interface VendorDetailsTabProps {
  ac_code: string;
  isEditMode: boolean;
  requestData: TVendorMain | null;
  // docNumber: string | null;
  requestNumber: string | null;
  onClose?: () => void;
  onTabChange?: (tabIndex: number) => void;
  disableActions?: boolean;
  hideAttachIcon?: boolean;
  showResetButton?: boolean;
}

const VendorApprovalRequestFormDisAct: React.FC<VendorDetailsTabProps> = ({
  ac_code,
  isEditMode,
  requestData,
  // docNumber,
  requestNumber,
  onClose,
  onTabChange,
  disableActions,
  hideAttachIcon,
  showResetButton
}) => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedRefDoc, setSelectedRefDoc] = useState<IRefDocNo | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<{ DIV_CODE: string; DIV_NAME: string } | null>(null);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);

  const [uploadFilesPopup, setUploadFilesPopup] = useState<TUniversalDialogProps>({
    action: {
      open: false,
      fullWidth: true,
      maxWidth: 'md'
    },
    title: intl.formatMessage({ id: 'UploadFiles' }) || 'Upload Files',
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (onTabChange) {
      onTabChange(newValue);
    }
  };

  const { data: vendorDivisionData } = useQuery({
    queryKey: ['divisions'],
    queryFn: () => VendorRequestService.getDivisionList()
  });

  const { data: vendorAccountData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      return await VendorRequestService.getAccountsList('BSG', ac_code ?? undefined);
    },
    enabled: !!ac_code
  });

  console.log('account name for edit', vendorAccountData);
  const company_code = 'BSG';

  const [vendorRefDoc, setVendorRefDoc] = useState<IRefDocNo[]>([]);
  const getVendorRefDoc = async () => {
    const data = await VendorRequestService.getRefDocNo(company_code, user?.loginid ?? '');
    setVendorRefDoc(data || []);
  };

  const [vendorDetails, setVendorDetails] = useState<detailsTVendor[]>([]);
  const [vendorRequest, setVendorRequest] = useState<TVendorMain | null>(null);

  console.log("vendorDetailsvendorDetails", vendorDetails)

  const getVendorDetails = async (docNo: string) => {
    if (!docNo) return;
    const Detailsdata = await VendorRequestService.getDetails(company_code, user?.loginid ?? '', docNo);
    setVendorDetails(Detailsdata || []);
  };

  useEffect(() => {
    if (vendorAccountData?.[0]) {
      setVendorRequest((prev) => ({
        COMPANY_CODE: vendorAccountData?.[0]?.COMPANY_CODE || '',
        DOC_NO: prev?.DOC_NO || '',
        items: prev?.items || [],
        REMARKS: prev?.REMARKS || ''
      }));
    }
  }, [vendorAccountData]);

  useEffect(() => {
    if (selectedRefDoc?.DOC_NO) {
      getVendorDetails(selectedRefDoc.DOC_NO);
    } else {
      setVendorDetails([]);
    }
  }, [selectedRefDoc]);

  const handleUploadPopup = () => {
    setUploadFilesPopup((prev) => {
      return { ...prev, action: { ...prev.action, open: !prev.action.open } };
    });
  };

  const handleSubmit = async (LAST_ACTION: string) => {
    if (!isEditMode) {
      if (!selectedRefDoc?.DOC_NO) {
        dispatch(showAlert({
          open: true, message: intl.formatMessage({ id: 'RefDocNoRequired' }) || 'Ref Doc No is required!',
          severity: 'warning'
        }));
        return;
      }
      if (!vendorRequest?.INVOICE_NUMBER?.trim()) {
        dispatch(showAlert({
          open: true, message: intl.formatMessage({ id: 'InvoiceNumberRequired' }) || 'Invoice Number is required!',
          severity: 'warning'
        }));
        return;
      }
    }

    dispatch(openBackdrop());
    try {
      const formattedPayload: TVendorMain = {
        ...vendorRequest,
        LAST_ACTION,
        EDIT_USER: user?.loginid || '',
        COMPANY_CODE: String(user?.company_code || ''),
        DOC_TYPE: selectedRefDoc?.DOC_TYPE || vendorRequest?.DOC_TYPE || '',
        DOC_NO: !isEditMode ? '' : String(vendorRequest?.DOC_NO ?? ''),
        REF_DOC_NO: selectedRefDoc?.DOC_NO || vendorRequest?.REF_DOC_NO || '',
        DOC_DATE: vendorRequest?.DOC_DATE || new Date().toISOString().slice(0, 10),
        AC_CODE: String(vendorAccountData?.[0]?.AC_CODE || vendorRequest?.AC_CODE || ''),
        AC_NAME: String(vendorAccountData?.[0]?.AC_NAME || vendorRequest?.AC_NAME || ''),
        ADDRESS: String(vendorAccountData?.[0]?.ADDRESS || vendorRequest?.ADDRESS || ''),
        FAX: String(vendorAccountData?.[0]?.FAX || vendorRequest?.FAX || ''),
        PHONE: String(vendorAccountData?.[0]?.PHONE || vendorRequest?.PHONE || ''),
        REMARKS: vendorRequest?.REMARKS == null ? '' : String(vendorRequest.REMARKS),
        INVOICE_NUMBER: vendorRequest?.INVOICE_NUMBER || '',
        INVOICE_DATE: vendorRequest?.INVOICE_DATE || '',
        DIV_CODE: selectedDivision?.DIV_CODE || vendorRequest?.DIV_CODE || '',
        DIV_NAME: selectedDivision?.DIV_NAME || vendorRequest?.DIV_NAME || '',
        items: (vendorDetails ?? []).map((item) => ({
          ...item,
          DOC_DATE: item.DOC_DATE || (vendorRequest?.DOC_DATE ?? new Date().toISOString().slice(0, 10)),
          AC_CODE: String(item.AC_CODE || vendorRequest?.AC_CODE || '')
        }))
      };

      console.log('inside form before')
      const requestNumber = await VendorSerivceInstance.updateVendorerequest(formattedPayload);

      if (requestNumber) {
        dispatch(showAlert({
          open: true, message: intl.formatMessage({ id: 'VendorRequestUpdated' }) || 'Vendor Request updated successfully!',

          severity: 'success'
        }));
        dispatch(showAlert({ open: true, message: `${requestNumber} Approved Successfully`, severity: 'success' }));
        setTimeout(() => {
          if (onClose) onClose();
        }, 1000);
      } else {
        throw new Error(intl.formatMessage({ id: 'UpdateReturnedFalse' }) || 'Update returned false.');
      }
    } catch (error: any) {
      dispatch(showAlert({
        open: true, message: intl.formatMessage({ id: 'VendorRequestUpdateError' }) || 'Something went wrong while updating the vendor request!',

        severity: 'error'
      }));
    } finally {
      dispatch(closeBackdrop());
    }
  };

  const loadVendorRequest = async () => {
    if (requestData) {
      try {
        let combined: string;

        if (user?.APPLICATION === 'EMPLOYEE') {
          combined = `${requestData.DOC_NO ?? ''}$$$${requestData.AC_CODE ?? ''}`;
        } else {
          combined = `${requestData.DOC_NO ?? ''}$$$${user?.loginid ?? ''}`;
        }

        // First call vendor request API
        const vendorReq = await VendorSerivceInstance.getVendorrequest(combined);

        if (vendorReq) {
          // Call vendor account API again with ac_code from vendorReq
          const accountRes = await VendorRequestService.getAccountsList(company_code, vendorReq.AC_CODE ?? undefined);

          // If match → merge account details into vendorReq
          if (accountRes?.[0] && accountRes[0].AC_CODE === vendorReq.AC_CODE) {
            setVendorRequest({
              ...vendorReq,
              AC_NAME: accountRes[0].AC_NAME,
              ADDRESS: accountRes[0].ADDRESS,
              FAX: accountRes[0].FAX,
              PHONE: accountRes[0].PHONE
            });
          } else {
            setVendorRequest(vendorReq);
          }

          setVendorDetails(vendorReq?.items ?? []);

          const refDoc = vendorRefDoc?.find((doc) => doc.DOC_NO === vendorReq.REF_DOC_NO);
          setSelectedRefDoc(refDoc || null);

          const division = vendorDivisionData?.find((div) => div.DIV_CODE === vendorReq.DIV_CODE);
          setSelectedDivision(division || null);
        }
      } catch (error) {
        console.error('Error loading Vendor request:', error);
      }
    }
  };

  useEffect(() => {
    getVendorRefDoc();
    if (isEditMode) {
      loadVendorRequest();
    }
  }, []);

  // -------- Send Back Request Popup --------
  const [sentBackPopup, setSentBackPopup] = useState<TUniversalDialogProps & { lastAction?: string }>({
    action: { open: false, fullWidth: true, maxWidth: 'sm' },
    title: intl.formatMessage({ id: 'SendBackRequest' }) || 'Send Back Request',
    data: { doc_no: '', remarks: '', flow_level: '' },
    lastAction: 'SENTBACK'
  });

  const handleSentBackPopupOpen = (doc_no: string, lastAction: string, flow_level?: string) => {
    setSentBackPopup((prev) => ({
      ...prev,
      action: { ...prev.action, open: true },
      data: { doc_no, remarks: '', flow_level: flow_level || '' },
      lastAction
    }));
  };

  const handleSentBackPopupClose = () => {
    setSentBackPopup((prev) => ({
      ...prev,
      action: { ...prev.action, open: false },
      data: { doc_no: '', remarks: '', flow_level: '' }
    }));
  };
  // -----------------------------------------

  return (
    <div>
      <Box sx={{ width: '100%' }}>
        <CustomAlert />
        <Paper elevation={1}>
          <Tabs value={activeTab} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
            <Tab label={intl.formatMessage({ id: 'InvoiceInformation' }) || 'Invoice Information'} />
            <Tab label={intl.formatMessage({ id: 'InvoiceDetails' }) || 'Invoice Details'} />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                {/* --- Invoice Info Fields --- */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label={intl.formatMessage({ id: 'DocNo' }) || 'Doc No'}
                    InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }} variant="outlined" value={isEditMode ? vendorRequest?.DOC_NO || '' : ''} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                        InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }}
                    fullWidth
                    type="date"
                    label={intl.formatMessage({ id: 'DocDate' }) || 'Doc Date'}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    value={convertToInputFormat(vendorRequest?.DOC_DATE) || convertToInputFormat(new Date().toISOString())}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  {isEditMode ? (
                    <TextField fullWidth
                      label={intl.formatMessage({ id: 'RefDocNo' }) || '*Ref Doc No'}
                      variant="outlined" value={vendorRequest?.REF_DOC_NO || ''}     InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }} />
                  ) : (
                    <Autocomplete
                      options={vendorRefDoc || []}
                      getOptionLabel={(option) => option.DOC_NO || ''}
                      value={selectedRefDoc}
                      isOptionEqualToValue={(option, value) => option.DOC_NO === value?.DOC_NO}
                      onChange={(event, newValue) => {
                        setSelectedRefDoc(newValue);
                        if (newValue) {
                          setVendorRequest((prev) =>
                            prev
                              ? { ...prev, DOC_NO: newValue.DOC_NO || '' }
                              : { COMPANY_CODE: '', DOC_NO: newValue.DOC_NO || '', items: [] }
                          );
                          const division = vendorDivisionData?.find((div) => div.DIV_CODE === newValue.DIV_CODE);
                          setSelectedDivision(division || null);
                          getVendorDetails(newValue.DOC_NO);
                        } else {
                          setSelectedDivision(null);
                          setVendorDetails([]);
                        }
                      }}
                      renderInput={(params) => <TextField {...params}
                        label={intl.formatMessage({ id: 'RefDocNo' }) || '*Ref Doc No'}
                        variant="outlined" />}
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={intl.formatMessage({ id: 'InvoiceNo' }) || '*Invoice No'}
                    variant="outlined"
                    value={isEditMode ? vendorRequest?.INVOICE_NUMBER || '' : ''}
                        InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }}
                    onChange={(e) =>
                      setVendorRequest((prev) =>
                        prev
                          ? { ...prev, INVOICE_NUMBER: e.target.value }
                          : { COMPANY_CODE: '', DOC_NO: '', items: [], INVOICE_NUMBER: e.target.value }
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={intl.formatMessage({ id: 'InvoiceDate' }) || 'Invoice Date'}
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    value={convertToInputFormat(vendorRequest?.INVOICE_DATE) || ''}
                        InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }}
                    onChange={(e) =>
                      setVendorRequest((prev) =>
                        prev
                          ? { ...prev, INVOICE_DATE: e.target.value }
                          : { COMPANY_CODE: '', DOC_NO: '', items: [], INVOICE_DATE: e.target.value }
                      )
                    }
                  />
                </Grid>

                {/* Account Details */}
                <Grid item xs={12} sm={2}>
                  <TextField
                    fullWidth
                    label={intl.formatMessage({ id: 'AccountNumber' }) || 'Account Number'}
                    variant="outlined"
                    value={isEditMode ? vendorRequest?.AC_CODE || '' : ''}
                       InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={10}>
                  <TextField
                    fullWidth
                    label={intl.formatMessage({ id: 'AccountName' }) || 'Account Name'}
                    variant="outlined"
                    value={isEditMode ? vendorRequest?.AC_NAME || '' : ''}
                       InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth label={intl.formatMessage({ id: 'Phone' }) || 'Phone'}
                    variant="outlined" value={isEditMode ? vendorRequest?.PHONE || '' : ''}    InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }}/>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField fullWidth label={intl.formatMessage({ id: 'Address' }) || 'Address'}
                    variant="outlined" value={isEditMode ? vendorRequest?.ADDRESS || '' : ''}    InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }}/>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth label={intl.formatMessage({ id: 'Fax' }) || 'Fax'}
                    variant="outlined" value={isEditMode ? vendorRequest?.FAX || '' : ''}    InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth label={intl.formatMessage({ id: 'DivisionCode' }) || 'Division Code'}
                    variant="outlined"
                    value={isEditMode ? vendorRequest?.DIV_CODE || '' : ''}
                       InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={intl.formatMessage({ id: 'DivisionName' }) || 'Division Name'}
                    variant="outlined"
                    value={selectedDivision?.DIV_NAME || (isEditMode ? vendorRequest?.DIV_NAME || '' : '')}
                       InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={12}>
                  <TextField
                    fullWidth
                    label={intl.formatMessage({ id: 'Remarks' }) || 'Remarks'}
                    variant="outlined"
                    value={vendorRequest?.REMARKS || ''}
                       InputProps={{
                      readOnly: true, // Makes it non-editable but keeps normal styling
                      sx: {
                        color: 'grey', // Dark grey text
                      },
                    }}
                    onChange={(e) =>
                      setVendorRequest((prev) =>
                        prev ? { ...prev, REMARKS: e.target.value } : { COMPANY_CODE: '', DOC_NO: '', items: [], REMARKS: e.target.value }
                      )
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ p: 2, maxWidth: '100%' }}>
              <VendorItemDeletRemove vendorDetails={vendorDetails} hideReset={showResetButton} disabled={isEditMode} />
            </Box>
          )}
        </Paper>

        {/* Action Buttons */}
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center" mt={3}>
          <ButtonGroup variant="contained" size="small">
            {/* Send Back Button */}
            <Button
              sx={{ backgroundColor: '#082a89' }}
              onClick={() => handleSentBackPopupOpen(requestData?.DOC_NO ?? '', 'SENTBACK', 'Level 1')}
              endIcon={<RiArrowGoBackFill />}
              disabled={disableActions || user?.APPLICATION !== 'EMPLOYEE'}
            >
              {intl.formatMessage({ id: 'SendBack' }) || 'Send Back'}
            </Button>

            {/* Reject Button */}
            <Button
              sx={{ backgroundColor: '#082a89' }}
              endIcon={<MdCancelScheduleSend />}
              onClick={() => handleSentBackPopupOpen(requestData?.DOC_NO ?? '', 'REJECTED')}
              disabled={disableActions || user?.APPLICATION !== 'EMPLOYEE'}
            >
              {intl.formatMessage({ id: 'Reject' }) || 'Reject'}
            </Button>
            <Button
              sx={{ backgroundColor: '#082a89' }}
              endIcon={<FaCheckCircle />}
              onClick={() => handleSubmit('APPROVED')}
              disabled={disableActions || user?.APPLICATION !== 'EMPLOYEE'}
            >

              {intl.formatMessage({ id: 'Approve' }) || 'Approve'}
            </Button>
          </ButtonGroup>

          <ButtonGroup variant="outlined" size="medium" aria-label="Basic button group">
            <Tooltip title={intl.formatMessage({ id: 'AttachView' }) || 'Attach & View'}>
              {/* {!hideAttachIcon && isEditMode ? (
                        
              ) : (
                <Button disabled>
                  <IoIosAttach />
                </Button>
              )} */}

              <Button onClick={() => setFilesDialogOpen(true)} >
                <IoIosAttach />
              </Button>


            </Tooltip>
            <Tooltip title={intl.formatMessage({ id: 'Exit' }) || 'Exit'}>
              <Button onClick={onClose}>
                <ImExit />
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Grid>

        {/* Send Back Popup */}
        {sentBackPopup.action.open && (
          <UniversalDialog
            action={{ ...sentBackPopup.action }}
            onClose={handleSentBackPopupClose}
            title={sentBackPopup.title}
            hasPrimaryButton={false}
          >
            <VendorSendBack
              onClose={handleSentBackPopupClose}
              docNo={sentBackPopup.data.doc_no}
              acCode={vendorAccountData?.[0]?.AC_CODE ?? ''}
              lastAction={sentBackPopup.lastAction ?? 'SETDBACK'}
              flow_level={sentBackPopup.data.flow_level}
            />
          </UniversalDialog>
        )}

        {/* Upload Files Popup */}
        {uploadFilesPopup && uploadFilesPopup.action.open && (
          <UniversalDialog
            action={{ ...uploadFilesPopup.action }}
            onClose={handleUploadPopup}
            title={uploadFilesPopup.title}
            hasPrimaryButton={false}
          >
            <VendorFilesDialog
              requestNumber={requestData?.DOC_NO || ''}
              isViewMode={!isEditMode}
              onClose={() => setFilesDialogOpen(false)}
            />
          </UniversalDialog>
        )}
        {filesDialogOpen && (
          <VendorFilesDialog requestNumber={requestData?.DOC_NO || ''} isViewMode={!isEditMode} onClose={() => setFilesDialogOpen(false)} hideUploadButton={true} hideEditDelete={true} />
        )}
      </Box>
    </div>
  );
};

export default VendorApprovalRequestFormDisAct;