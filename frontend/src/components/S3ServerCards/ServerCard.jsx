import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
} from "@mui/material";
import PropTypes from "prop-types";

function ServerCard({ instance, onToggle }) {
  const background = (theme) => {
    if (instance.instance_status === "running") {
      return theme.palette.mode === "dark"
        ? theme.palette.success.dark
        : theme.palette.success.light;
    }
  };

  let toggleText = "";
  if (instance.instance_status === "starting") {
    toggleText = "Starting...";
  } else if (instance.instance_status === "stopping") {
    toggleText = "Stopping...";
  } else if (instance.instance_status === "running") {
    toggleText = "Stop";
  } else if (instance.instance_status === "stopped") {
    toggleText = "Start";
  }

  return (
    <Card
      sx={{
        borderRadius: "16px",
        boxShadow: 3,
        transition: "transform 0.2s, box-shadow 0.2s",
        background,
        "&:hover": {
          transform: "scale(1.03)",
          boxShadow: 6,
        },
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {instance.name}
        </Typography>
        <Typography variant="body2">
          <strong>ID:</strong> {instance.instance_id}
        </Typography>
        <Typography variant="body2">
          <strong>Region:</strong> {instance.region}
        </Typography>
        <Typography variant="body2">
          <strong>Private IP:</strong> {instance.private_ip}
        </Typography>
        <Typography variant="body2">
          <strong>Status:</strong> {instance.instance_status}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          color={instance.instance_status === "running" ? "error" : "success"}
          onClick={() =>
            onToggle(instance.instance_id, instance.region, instance.instance_status)
          }
          disabled={
            instance.instance_status === "starting" || instance.instance_status === "stopping"
          }
        >
          {toggleText}
        </Button>
      </CardActions>
    </Card>
  );
}

ServerCard.propTypes = {
  instance: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ServerCard;
