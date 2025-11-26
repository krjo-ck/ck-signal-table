import { useSearchParams } from 'react-router-dom';
import { useProjectData, useSessionData, useSignalData } from '@kvaser/canking-api/hooks';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { SelectSignalsControl } from '@kvaser/canking-api/controls';
import { useCallback, useEffect } from 'react';

// If any data should be stored in the project file then add it to this interface
interface IProjectData {
  // An array of selected qualified signal names
  qualifiedSignalNames: string[];
}

// Define any default values for the project data that will be used when the component is created
const defaultProjectData: IProjectData = {
  qualifiedSignalNames: [],
};

// If any data should be stored in the session data then add it to this interface
// Session data will be persistent when the view is hidden, but it will not be saved to the project file
interface ISessionData {
  // An array of signal data objects that are currently being displayed
  signalData: {
    // The fully qualified signal name, the unique identifier for the signal
    qualifiedName: string;
    // The user-friendly name of the signal
    name: string;
    // The current value of the signal
    value: string;
    // The unit of the signal
    unit: string;
  }[];
}

// Define any default values for the project data that will be used when the component is created
const defaultSessionData: ISessionData = {
  signalData: [],
};

// This component is the component that will be loaded into the Workspace view
function WorkspaceView() {
  // Get this view's unique id from search params
  const [searchParams] = useSearchParams();
  const idString = searchParams.get('id');
  const id = idString !== null ? Number.parseInt(idString, 10) : -1;

  // Use the useProjectData hook to serialize/deserialize your view data to the project
  const { projectData, setProjectData } = useProjectData<IProjectData>(id, defaultProjectData);

  // Use the useSessionData hook to serialize/deserialize your view data to the session data
  const { sessionData, setSessionData } = useSessionData<ISessionData>(id, defaultSessionData);

  // Handler for when the selected signals change
  const handleSelectedSignalsChange = useCallback(
    (qualifiedSignalNames: string[]) => {
      // Update the project data with the new selected signals
      setProjectData(curr => ({
        ...curr,
        qualifiedSignalNames,
      }));
    },
    [setProjectData],
  );

  // Effect to update the session data when the selected signals in the project data change
  useEffect(() => {
    // Create new signal data array based on the selected signals
    const newSignalData = projectData.qualifiedSignalNames.map(qualifiedName => ({
      qualifiedName,
      name: qualifiedName.split('.').pop() || qualifiedName, // Use the last part of the qualified name as the display name
      value: 'N/A', // Placeholder value
      unit: '', // Placeholder unit
    }));

    // Update the session data with the new signal data
    setSessionData(curr => ({
      ...curr,
      signalData: newSignalData,
    }));
  }, [projectData.qualifiedSignalNames, setSessionData]);

  // Subscribe on signal value updates
  const signalDataUpdates = useSignalData(projectData.qualifiedSignalNames);
  useEffect(() => {
    // Update the session data with the latest signal values
    setSessionData(curr => ({
      ...curr,
      signalData: curr.signalData.map(signal => {
        const signalDataUpdate = signalDataUpdates.find(s => s.qualifiedName === signal.qualifiedName);
        return {
          ...signal,
          name: signalDataUpdate?.name ?? signal.name,
          value: signalDataUpdate?.stringValue ?? signalDataUpdate?.doubleValue.toString() ?? signal.value,
          unit: signalDataUpdate?.unit ?? signal.unit,
        };
      }),
    }));
  }, [setSessionData, signalDataUpdates]);

  return (
    <Box aria-label="canking-extension-view" height={'100%'} width={'100%'}>
      <div style={{ marginLeft: '4px', marginRight: '4px' }}>
        <SelectSignalsControl
          selectedSignals={projectData.qualifiedSignalNames}
          onSelectedSignalseChange={handleSelectedSignalsChange}
          parentDialogTitle="Signal Data Table"
        />
        <TableContainer>
          <Table aria-label="signal-data-table" size="small" padding="none">
            <TableHead>
              <TableRow>
                <TableCell>Signal</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Unit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessionData.signalData.map(signal => (
                <TableRow key={signal.qualifiedName} hover>
                  <TableCell component="th" scope="row">
                    {signal.name}
                  </TableCell>
                  <TableCell>{signal.value}</TableCell>
                  <TableCell>{signal.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </Box>
  );
}

export default WorkspaceView;
