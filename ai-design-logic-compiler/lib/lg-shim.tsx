/**
 * Via (LeafyGreen 3.0) component re-exports.
 * Replaces the old LeafyGreen shim — all components now come from @via-ds/components.
 */
export {
  Button,
  Badge,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  TextArea,
  ViaProvider,
} from '@via-ds/components';

// Via uses TextField (not TextInput) — export under both names for compatibility
export { TextField, TextField as TextInput } from '@via-ds/components';
