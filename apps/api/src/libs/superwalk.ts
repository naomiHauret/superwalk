enum StepCountReportSource {
  self = 'SELF',
  // other source of step count would include HealthConnect dataOrigin
  // eg: com.fitbit.FitbitMobile
  // since the HealthConnect API doesn't properly return the recording method
  // we have to rely on the device sensor to record steps
  // not ideal, but there's no other choice if we want to insure a fair game
}
