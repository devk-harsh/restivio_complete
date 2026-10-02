const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

export function getInclusiveDateRange(
  startDate: string,
  endDate: string
): string[] {
  const start = new Date(
    `${startDate}T00:00:00.000Z`
  );

  const end = new Date(
    `${endDate}T00:00:00.000Z`
  );

  const dates: string[] = [];

  const current = new Date(start);

  while (current <= end) {
    dates.push(
      current.toISOString().slice(0, 10)
    );

    current.setUTCDate(
      current.getUTCDate() + 1
    );
  }

  return dates;
}

export function getInclusiveDayCount(
  startDate: string,
  endDate: string
): number {
  const start = new Date(
    `${startDate}T00:00:00.000Z`
  );

  const end = new Date(
    `${endDate}T00:00:00.000Z`
  );

  return (
    Math.floor(
      (end.getTime() - start.getTime()) /
        MILLISECONDS_PER_DAY
    ) + 1
  );
}

export function getStayDates(
  checkIn: string,
  checkOut: string
): string[] {
  const start = new Date(
    `${checkIn}T00:00:00.000Z`
  );

  const end = new Date(
    `${checkOut}T00:00:00.000Z`
  );

  const dates: string[] = [];

  const current = new Date(start);

  while (current < end) {
    dates.push(
      current.toISOString().slice(0, 10)
    );

    current.setUTCDate(
      current.getUTCDate() + 1
    );
  }

  return dates;
}

export function getNightCount(
  checkIn: string,
  checkOut: string
): number {
  const start = new Date(
    `${checkIn}T00:00:00.000Z`
  );

  const end = new Date(
    `${checkOut}T00:00:00.000Z`
  );

  return Math.floor(
    (end.getTime() - start.getTime()) /
      MILLISECONDS_PER_DAY
  );
}