import { Card, CardContent, CardHeader, Grid, Typography } from "@mui/material";
import HealthInfo from "./HealthInfo";
import PropTypes from "prop-types";

function ZoneCard({ zone }) {
  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader
        title={zone.hosted_zone}
        subheader={`Main URL: ${zone.main_url}`}
        sx={{ backgroundColor: "#212121", color: "#fff" }}
      />
      <CardContent>
        <Grid container spacing={2}>
          {zone.primary && (
            <Grid item xs={12} md={6}>
              <Typography variant="h6">🔵 Primary</Typography>
              <Typography>
                <strong>DNS:</strong> {zone.primary.dns_name}
              </Typography>
              <Typography>
                <strong>Alias:</strong> {zone.primary.alias_target}
              </Typography>
              <Typography>
                <strong>Location:</strong> {zone.primary.location}
              </Typography>
              <HealthInfo record={zone.primary} />
            </Grid>
          )}
          {zone.secondary && (
            <Grid item xs={12} md={6}>
              <Typography variant="h6">🔴 Secondary</Typography>
              <Typography>
                <strong>DNS:</strong> {zone.secondary.dns_name}
              </Typography>
              <Typography>
                <strong>Alias:</strong> {zone.secondary.alias_target}
              </Typography>
              <Typography>
                <strong>Location:</strong> {zone.secondary.location}
              </Typography>
              <HealthInfo record={zone.secondary} />
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}

ZoneCard.propTypes = {
  zone: PropTypes.shape({
    hosted_zone: PropTypes.string.isRequired,
    main_url: PropTypes.string.isRequired,
    primary: PropTypes.object,
    secondary: PropTypes.object,
  }).isRequired,
};

export default ZoneCard;
