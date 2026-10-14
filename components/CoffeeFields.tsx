import { View, Text, StyleSheet } from 'react-native';
import { ROAST_LEVELS } from '../types';
import { CoffeeFormValues, parseRoastDate } from '../lib/form';
import { daysAgo, daysSinceRoast, formatRoastDate } from '../lib/coffeeStats';
import { colors } from '../lib/theme';
import { Field, SelectPills, formStyles } from './FormFields';
import ScanBagButton, { BAG_SCAN_AVAILABLE } from './ScanBagButton';

/**
 * A coffee's fields, used by the coffee form and by "New coffee" in the brew form. `scan` offers
 * Scan the Bag above them, for a new coffee.
 */
export default function CoffeeFields({
  values, onChange, scan = false,
}: { values: CoffeeFormValues; onChange: (patch: Partial<CoffeeFormValues>) => void; scan?: boolean }) {
  const roastDate = parseRoastDate(values.roastDate);
  // Says back the date it read, since it's typed rather than picked
  const roastDateHint = roastDate
    ? `${formatRoastDate(roastDate)}, ${daysAgo(daysSinceRoast(roastDate)!)}`
    : roastDate === undefined ? 'Not a date yet: try Oct 5, 10/5 or yesterday' : null;

  return (
    <>
      {scan && BAG_SCAN_AVAILABLE ? <ScanBagButton onScanned={onChange} /> : null}

      <Field
        label="Coffee Name"
        required
        value={values.name}
        onChangeText={(name) => onChange({ name })}
        placeholder="e.g. Ethiopia Yirgacheffe"
      />

      <View style={formStyles.row2}>
        <Field label="Roaster" containerStyle={formStyles.flex1} value={values.roaster} onChangeText={(roaster) => onChange({ roaster })} placeholder="Roaster name" />
        <Field label="Origin" containerStyle={formStyles.flex1} value={values.origin} onChangeText={(origin) => onChange({ origin })} placeholder="Country/Region" />
      </View>

      <SelectPills options={ROAST_LEVELS} value={values.roastLevel} onChange={(roastLevel) => onChange({ roastLevel })} label="Roast Level" />

      <View style={formStyles.row2}>
        <Field label="Varietal" containerStyle={formStyles.flex1} value={values.varietal} onChangeText={(varietal) => onChange({ varietal })} placeholder="e.g. Gesha, Bourbon" />
        <Field label="Processing Method" containerStyle={formStyles.flex1} value={values.processingMethod} onChangeText={(processingMethod) => onChange({ processingMethod })} placeholder="e.g. Washed, Natural" />
      </View>

      <View style={formStyles.row2}>
        <View style={formStyles.flex1}>
          <Field
            label="Roast Date"
            containerStyle={roastDateHint ? styles.withHint : undefined}
            value={values.roastDate}
            onChangeText={(text) => onChange({ roastDate: text })}
            placeholder="e.g. Oct 5"
            autoCorrect={false}
            aria-describedby="roast-date-hint"
          />
          {roastDateHint ? (
            <Text style={[styles.hint, roastDate === undefined && styles.hintError]} nativeID="roast-date-hint" aria-live="polite">
              {roastDateHint}
            </Text>
          ) : null}
        </View>
        <Field label="Bag Size (g)" containerStyle={formStyles.flex1} value={values.bagSize} onChangeText={(bagSize) => onChange({ bagSize })} keyboardType="numeric" placeholder="340" />
      </View>

      <Field
        label="Roaster's Tasting Notes"
        value={values.roasterNotes}
        onChangeText={(roasterNotes) => onChange({ roasterNotes })}
        placeholder="What the bag says, e.g. blueberry, jasmine"
        multiline
      />
    </>
  );
}

const styles = StyleSheet.create({
  withHint: { marginBottom: 4 },
  hint: { fontSize: 12, color: colors.textLight, marginBottom: 12 },
  hintError: { color: colors.error },
});
