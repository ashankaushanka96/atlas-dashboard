import asyncio
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect

from facade import facade
from models.watcher_control_section_models import (
    ComponentActionRequest,
    ConfigureWatcherRequest,
    ConfigureWatcherResponse,
    FetchComponentLogsResponse,
    FetchWatcherComponentsResponse,
    ReadComponentLogResponse,
    RollbackWatcherRequest,
    RollbackWatcherResponse,
    WatcherActionRequest,
    WatcherLifecycleResponse,
)

router = APIRouter(prefix="/api/v1/watcher-control", tags=["Watcher Control"])

###############################################################################################
#                              WATCHER CONTROL SECTION ENDPOINTS                               #
###############################################################################################
@router.get(
    "/fetch-components",
    response_model=FetchWatcherComponentsResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("configure_watcher"))],
)
def fetch_watcher_components(
    region: str = Query(..., description="Region the host belongs to"),
    ip: str = Query(..., description="Primary IP of the host running the watcher"),
):
    """
    Fetch the components currently defined in the watcher's config.ini on a host,
    so the Configure Watcher UI can list them for deletion.
    """
    return facade.watcher_control_section.fetch_components(region=region, ip=ip)


@router.get(
    "/status",
    response_model=WatcherLifecycleResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("configure_watcher"))],
)
def fetch_watcher_status(
    region: str = Query(..., description="Region the host belongs to"),
    ip: str = Query(..., description="Primary IP of the host running the watcher"),
):
    """
    Check whether the all-in-one-watcher process is currently running on a host.
    """
    return facade.watcher_control_section.fetch_status(region=region, ip=ip)


@router.post(
    "/start",
    response_model=WatcherLifecycleResponse,
    dependencies=[Depends(facade.auth.require_permission("restart_watcher"))],
)
def start_watcher(req: WatcherActionRequest):
    """
    Start the all-in-one-watcher process on a host (also clears a prior stop).
    """
    return facade.watcher_control_section.start_watcher(region=req.region, ip=req.ip)


@router.post(
    "/stop",
    response_model=WatcherLifecycleResponse,
    dependencies=[Depends(facade.auth.require_permission("restart_watcher"))],
)
def stop_watcher(req: WatcherActionRequest):
    """
    Stop the all-in-one-watcher process on a host and disable auto-restart
    until it's started again.
    """
    return facade.watcher_control_section.stop_watcher(region=req.region, ip=req.ip)


@router.post(
    "/restart",
    response_model=WatcherLifecycleResponse,
    dependencies=[Depends(facade.auth.require_permission("restart_watcher"))],
)
def restart_watcher(req: WatcherActionRequest):
    """
    Restart the all-in-one-watcher process on a host.
    """
    return facade.watcher_control_section.restart_watcher(region=req.region, ip=req.ip)


@router.post(
    "/configure",
    response_model=ConfigureWatcherResponse,
    dependencies=[Depends(facade.auth.require_permission("configure_watcher"))],
)
def configure_watcher(req: ConfigureWatcherRequest):
    """
    Add and/or remove component sections in the watcher's config.ini on a host,
    optionally restarting the watcher afterwards so the change takes effect.
    """
    return facade.watcher_control_section.configure_watcher(
        region=req.region,
        ip=req.ip,
        add_components=req.add_components,
        remove_component_ids=req.remove_component_ids,
        restart=req.restart,
    )


@router.post(
    "/rollback",
    response_model=RollbackWatcherResponse,
    dependencies=[Depends(facade.auth.require_permission("configure_watcher"))],
)
def rollback_watcher(req: RollbackWatcherRequest):
    """
    Restore config.ini on a host from the single latest backup taken before
    its last change, optionally restarting the watcher afterwards.
    """
    return facade.watcher_control_section.rollback_watcher(region=req.region, ip=req.ip, restart=req.restart)


@router.get(
    "/component/status",
    response_model=WatcherLifecycleResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("restart_component"))],
)
def fetch_component_status(
    region: str = Query(..., description="Region the host belongs to"),
    ip: str = Query(..., description="Primary IP of the host running the watcher"),
    tag: str = Query(..., description="config.ini tag identifying the component"),
):
    """
    Check whether a specific component's process is currently running on a host.
    """
    return facade.watcher_control_section.fetch_component_status(region=region, ip=ip, tag=tag)


@router.post(
    "/component/start",
    response_model=WatcherLifecycleResponse,
    dependencies=[Depends(facade.auth.require_permission("restart_component"))],
)
def start_component(req: ComponentActionRequest):
    """
    Run a component's own run.sh (via the watcher API) to start it.
    """
    return facade.watcher_control_section.start_component(region=req.region, ip=req.ip, tag=req.tag)


@router.post(
    "/component/stop",
    response_model=WatcherLifecycleResponse,
    dependencies=[Depends(facade.auth.require_permission("restart_component"))],
)
def stop_component(req: ComponentActionRequest):
    """
    Run a component's own kill.sh (via the watcher API) to stop it.
    """
    return facade.watcher_control_section.stop_component(region=req.region, ip=req.ip, tag=req.tag)


@router.post(
    "/component/restart",
    response_model=WatcherLifecycleResponse,
    dependencies=[Depends(facade.auth.require_permission("restart_component"))],
)
def restart_component(req: ComponentActionRequest):
    """
    Run a component's own restart.sh (via the watcher API) to restart it.
    """
    return facade.watcher_control_section.restart_component(region=req.region, ip=req.ip, tag=req.tag)


@router.get(
    "/component/logs",
    response_model=FetchComponentLogsResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_component_logs"))],
)
def fetch_component_logs(
    region: str = Query(..., description="Region the host belongs to"),
    ip: str = Query(..., description="Primary IP of the host running the watcher"),
    tag: str = Query(..., description="config.ini tag identifying the component"),
):
    """
    List the log files available in a component's log directory.
    """
    return facade.watcher_control_section.fetch_component_logs(region=region, ip=ip, tag=tag)


@router.get(
    "/component/logs/tail",
    response_model=ReadComponentLogResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_component_logs"))],
)
def tail_component_log(
    region: str = Query(...),
    ip: str = Query(...),
    tag: str = Query(...),
    file: str = Query(..., description="Log file name (no path separators)"),
    lines: int = Query(200, ge=1, le=5000),
):
    """
    tail -n equivalent: the last N lines of a component's log file.
    """
    return facade.watcher_control_section.tail_component_log(region=region, ip=ip, tag=tag, file=file, lines=lines)


@router.get(
    "/component/logs/page",
    response_model=ReadComponentLogResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_component_logs"))],
)
def page_component_log(
    region: str = Query(...),
    ip: str = Query(...),
    tag: str = Query(...),
    file: str = Query(...),
    offset: int = Query(0, ge=0),
    lines: int = Query(200, ge=1, le=2000),
):
    """
    less-style paginated read: a page of lines starting at a byte offset,
    with the offset to continue from for the next page.
    """
    return facade.watcher_control_section.page_component_log(
        region=region, ip=ip, tag=tag, file=file, offset=offset, lines=lines
    )


@router.get(
    "/component/logs/grep",
    response_model=ReadComponentLogResponse,
    dependencies=[Depends(facade.auth.require_permission_flexible("view_component_logs"))],
)
def grep_component_log(
    region: str = Query(...),
    ip: str = Query(...),
    tag: str = Query(...),
    file: str = Query(...),
    pattern: List[str] = Query(..., description="Repeat for a chained/inner grep - all patterns must match (AND)"),
    offset: int = Query(0, ge=0),
    lines: int = Query(200, ge=1, le=2000),
    ignore_case: bool = Query(False),
    regex: bool = Query(False),
):
    """
    less + grep equivalent: matching lines starting at a byte offset, with
    the offset to continue scanning from for the next batch. Multiple
    ?pattern= values chain like `grep a | grep b | grep c`.
    """
    return facade.watcher_control_section.grep_component_log(
        region=region,
        ip=ip,
        tag=tag,
        file=file,
        patterns=pattern,
        offset=offset,
        lines=lines,
        ignore_case=ignore_case,
        regex=regex,
    )


@router.get(
    "/component/logs/download",
    dependencies=[Depends(facade.auth.require_permission_flexible("download_component_logs"))],
)
def download_component_log(
    region: str = Query(...),
    ip: str = Query(...),
    tag: str = Query(...),
    file: str = Query(...),
):
    """
    Stream a component's raw log file for download.
    """
    return facade.watcher_control_section.download_component_log(region=region, ip=ip, tag=tag, file=file)


@router.get(
    "/component/logs/grep/download",
    dependencies=[Depends(facade.auth.require_permission_flexible("download_component_logs"))],
)
def download_grep_component_log(
    region: str = Query(...),
    ip: str = Query(...),
    tag: str = Query(...),
    file: str = Query(...),
    pattern: List[str] = Query(..., description="Repeat for a chained/inner grep - all patterns must match (AND)"),
    ignore_case: bool = Query(False),
    regex: bool = Query(False),
):
    """
    Stream only the lines matching every pattern, scanning the whole file -
    unlike /component/logs/grep this isn't paginated, so it's meant for a
    one-shot "download the filtered log" rather than interactive browsing.
    """
    return facade.watcher_control_section.download_grep_component_log(
        region=region, ip=ip, tag=tag, file=file, patterns=pattern, ignore_case=ignore_case, regex=regex
    )


@router.websocket("/component/logs/ws-tail")
async def ws_tail_component_log(websocket: WebSocket):
    """
    Real-time tail -f over a WebSocket: sends the current tail once as a
    seed, then polls the watcher every second for any bytes appended since
    and pushes only the new lines - so a viewer never has to click Refresh.

    There's no persistent watcher-side connection or file-watch involved;
    this is the same tail/page REST endpoints the UI already uses, just
    polled server-side on a tight loop and pushed to the browser instead of
    the browser polling on its own every few seconds.
    """
    token = websocket.query_params.get("token")
    try:
        user = facade.auth.authenticate_websocket_token(token)
    except HTTPException:
        await websocket.close(code=1008)
        return
    if not user.role.permissions.get("view_component_logs", False):
        await websocket.close(code=1008)
        return

    region = websocket.query_params.get("region")
    ip = websocket.query_params.get("ip")
    tag = websocket.query_params.get("tag")
    file = websocket.query_params.get("file")
    if not all([region, ip, tag, file]):
        await websocket.close(code=1008)
        return

    try:
        seed_lines = max(1, min(int(websocket.query_params.get("lines", 200)), 5000))
    except ValueError:
        seed_lines = 200

    await websocket.accept()

    try:
        seed = await asyncio.to_thread(
            facade.watcher_control_section.tail_component_log, region, ip, tag, file, seed_lines
        )
    except HTTPException as exc:
        await websocket.send_json({"type": "error", "detail": exc.detail})
        await websocket.close(code=1011)
        return

    await websocket.send_json({"type": "seed", "lines": seed.lines, "total_size": seed.total_size})
    offset = seed.total_size or 0

    try:
        while True:
            try:
                page = await asyncio.to_thread(
                    facade.watcher_control_section.page_component_log, region, ip, tag, file, offset, 2000
                )
            except HTTPException as exc:
                await websocket.send_json({"type": "error", "detail": exc.detail})
                await asyncio.sleep(2)
                continue

            if page.lines:
                await websocket.send_json({"type": "log_lines", "lines": page.lines})
            if page.next_offset is not None:
                offset = page.next_offset

            # Still behind (a burst of writes since the last poll) - keep
            # draining without waiting so the viewer catches up quickly.
            if not page.eof:
                continue
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
    except Exception:
        try:
            await websocket.close(code=1011)
        finally:
            return
